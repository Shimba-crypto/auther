import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const DATA_DIR = path.join(process.cwd(), "data");
const fileCache = {};

// ---------- backend selection ----------
const DATABASE_URL = process.env.DATABASE_URL || "";
let pgPool = null;
let usingPg = false;

export function isPg() {
  return usingPg;
}

function pgSsl(url) {
  // Railway internal + localhost are plain; public proxies use self-signed certs
  if (/localhost|127\.0\.0\.1|\.internal/.test(url)) return false;
  return { rejectUnauthorized: false };
}

// ---------- low-level file helpers (fallback mode) ----------
function read(f, fallback) {
  if (fileCache[f] !== undefined) return fileCache[f];
  const fp = path.join(DATA_DIR, f);
  if (!fs.existsSync(fp)) return fallback;
  try { return JSON.parse(fs.readFileSync(fp, "utf-8")); }
  catch { return fallback; }
}

function write(f, data) {
  fileCache[f] = data;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, f), JSON.stringify(data, null, 2));
}

// ---------- init ----------
export async function initStorage() {
  if (!DATABASE_URL) {
    usingPg = false;
    console.log("[storage] file mode (no DATABASE_URL)");
    if (fs.existsSync(DATA_DIR)) {
      fs.readdirSync(DATA_DIR).forEach((f) => {
        if (f.endsWith(".json")) fileCache[f] = read(f);
      });
    }
    return;
  }
  try {
    const pg = (await import("pg")).default;
    pgPool = new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: pgSsl(DATABASE_URL),
      max: 5,
    });
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS auther_users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS auther_tokens (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_auther_tokens_user ON auther_tokens (user_id);
      CREATE TABLE IF NOT EXISTS auther_sso_codes (
        code TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        redirect_uri TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    usingPg = true;
    console.log("[storage] postgres mode (DATABASE_URL)");
  } catch (e) {
    // Fail-soft: never crash-loop the auth service over a DB hiccup.
    usingPg = false;
    pgPool = null;
    console.error("[storage] postgres init FAILED, falling back to file mode:", e.message);
  }
}

async function q(sql, params) {
  const r = await pgPool.query(sql, params);
  return r.rows;
}

// ---------- users ----------
export async function listUsers() {
  if (!usingPg) return read("users.json", []);
  try { return await q(`SELECT * FROM auther_users ORDER BY created_at ASC`); }
  catch (e) { console.error("[storage] listUsers:", e.message); return []; }
}

export async function findUser(id) {
  if (!id) return null;
  if (!usingPg) return read("users.json", []).find((u) => u.id === id) || null;
  try {
    const rows = await q(`SELECT * FROM auther_users WHERE id = $1`, [id]);
    return rows[0] || null;
  } catch (e) { console.error("[storage] findUser:", e.message); return null; }
}

export async function findUserByEmail(email) {
  if (!email) return null;
  const em = String(email).toLowerCase();
  if (!usingPg) return read("users.json", []).find((u) => u.email === em) || null;
  try {
    const rows = await q(`SELECT * FROM auther_users WHERE email = $1`, [em]);
    return rows[0] || null;
  } catch (e) { console.error("[storage] findUserByEmail:", e.message); return null; }
}

export async function createUser({ name, email, password, role = "user" }) {
  if (await findUserByEmail(email)) return { error: "email taken" };

  // Stronger password validation (storage level)
  if (password.length < 8) return { error: "password must be at least 8 characters" };
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { error: "password must contain letters and numbers" };
  }

  const user = {
    id: "usr_" + crypto.randomBytes(8).toString("hex"),
    name,
    email: email.toLowerCase(),
    passwordHash: bcrypt.hashSync(password, 12),
    role,
    active: true,
    createdAt: new Date().toISOString(),
  };

  if (!usingPg) {
    const users = read("users.json", []);
    users.push(user);
    write("users.json", users);
    return { user: publicUser(user) };
  }
  try {
    const rows = await q(
      `INSERT INTO auther_users (id, name, email, password_hash, role, active)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
      [user.id, user.name, user.email, user.passwordHash, user.role]
    );
    return { user: publicUser(rows[0]) };
  } catch (e) {
    console.error("[storage] createUser:", e.message);
    return { error: "could not create user" };
  }
}

export async function updateUserName(id, name) {
  if (!usingPg) {
    const users = read("users.json", []);
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return null;
    users[idx].name = name;
    write("users.json", users);
    return publicUser(users[idx]);
  }
  try {
    const rows = await q(`UPDATE auther_users SET name = $2 WHERE id = $1 RETURNING *`, [id, name]);
    return rows[0] ? publicUser(rows[0]) : null;
  } catch (e) { console.error("[storage] updateUserName:", e.message); return null; }
}

export async function verifyCredentials(email, password) {
  const user = await findUserByEmail(email);
  if (!user || !user.active) return null;
  const hash = usingPg ? user.password_hash : user.passwordHash;
  if (!hash || !bcrypt.compareSync(password, hash)) return null;
  return user;
}

// ---------- tokens ----------
export async function issueToken(userId) {
  const token = "ath_" + crypto.randomBytes(24).toString("hex") + Date.now().toString(36);
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  if (!usingPg) {
    const tokens = read("tokens.json", []);
    tokens.push({ token, userId, expiresAt, createdAt: new Date().toISOString() });
    write("tokens.json", tokens);
    return token;
  }
  try {
    await q(`INSERT INTO auther_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)`, [token, userId, expiresAt]);
  } catch (e) { console.error("[storage] issueToken:", e.message); }
  return token;
}

export async function verifyToken(token) {
  if (!token) return null;
  if (!usingPg) {
    const tokens = read("tokens.json", []);
    const t = tokens.find((x) => x.token === token);
    if (!t || Date.now() > t.expiresAt) return null;
    return findUser(t.userId);
  }
  try {
    const rows = await q(
      `SELECT u.* FROM auther_tokens t JOIN auther_users u ON u.id = t.user_id
       WHERE t.token = $1 AND t.expires_at > $2`,
      [token, Date.now()]
    );
    return rows[0] || null;
  } catch (e) { console.error("[storage] verifyToken:", e.message); return null; }
}

export async function revokeToken(token) {
  if (!token) return;
  if (!usingPg) {
    const tokens = read("tokens.json", []);
    write("tokens.json", tokens.filter((t) => t.token !== token));
    return;
  }
  try { await q(`DELETE FROM auther_tokens WHERE token = $1`, [token]); }
  catch (e) { console.error("[storage] revokeToken:", e.message); }
}

// ---------- SSO codes ----------
export async function saveSsoCode({ code, userId, clientId, redirectUri, expiresAt }) {
  if (!usingPg) {
    const codes = read("sso-codes.json", {});
    codes[code] = { userId, clientId, redirectUri, expiresAt, used: false };
    write("sso-codes.json", codes);
    return;
  }
  try {
    await q(
      `INSERT INTO auther_sso_codes (code, user_id, client_id, redirect_uri, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [code, userId, clientId, redirectUri, expiresAt]
    );
  } catch (e) { console.error("[storage] saveSsoCode:", e.message); }
}

export async function getSsoCode(code) {
  if (!usingPg) {
    const c = read("sso-codes.json", {})[code];
    return c ? { userId: c.userId, clientId: c.clientId, redirectUri: c.redirectUri, expiresAt: c.expiresAt, used: c.used } : null;
  }
  try {
    const rows = await q(`SELECT * FROM auther_sso_codes WHERE code = $1`, [code]);
    const r = rows[0];
    return r ? { userId: r.user_id, clientId: r.client_id, redirectUri: r.redirect_uri, expiresAt: Number(r.expires_at), used: r.used } : null;
  } catch (e) { console.error("[storage] getSsoCode:", e.message); return null; }
}

export async function markSsoCodeUsed(code) {
  if (!usingPg) {
    const codes = read("sso-codes.json", {});
    if (codes[code]) codes[code].used = true;
    write("sso-codes.json", codes);
    return;
  }
  try { await q(`UPDATE auther_sso_codes SET used = TRUE WHERE code = $1`, [code]); }
  catch (e) { console.error("[storage] markSsoCodeUsed:", e.message); }
}

// ---------- shared ----------
export function publicUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, createdAt: u.created_at || u.createdAt };
}
