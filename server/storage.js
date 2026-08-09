import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const DATA_DIR = path.join(process.cwd(), "data");
const cache = {};

export function read(f, fallback) {
  if (cache[f] !== undefined) return cache[f];
  const fp = path.join(DATA_DIR, f);
  if (!fs.existsSync(fp)) return fallback;
  try { return JSON.parse(fs.readFileSync(fp, "utf-8")); }
  catch { return fallback; }
}

export function write(f, data) {
  cache[f] = data;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, f), JSON.stringify(data, null, 2));
}

export function listUsers() { return read("users.json", []); }
export function findUser(id) { return listUsers().find((u) => u.id === id); }
export function findUserByEmail(email) { return listUsers().find((u) => u.email === email.toLowerCase()); }

export function createUser({ name, email, password, role = "user" }) {
  const users = listUsers();
  if (users.some((u) => u.email === email.toLowerCase())) return { error: "email taken" };
  if (password.length < 6) return { error: "password too short" };
  const user = {
    id: "usr_" + crypto.randomBytes(8).toString("hex"),
    name, email: email.toLowerCase(), passwordHash: bcrypt.hashSync(password, 10),
    role, active: true, createdAt: new Date().toISOString(),
  };
  users.push(user);
  write("users.json", users);
  return { user: publicUser(user) };
}

export function verifyCredentials(email, password) {
  const user = findUserByEmail(email);
  if (!user || !user.active) return null;
  if (!bcrypt.compareSync(password, user.passwordHash)) return null;
  return user;
}

export function issueToken(userId) {
  const token = "ath_" + crypto.randomBytes(24).toString("hex") + Date.now().toString(36);
  const tokens = read("tokens.json", []);
  tokens.push({ token, userId, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, createdAt: new Date().toISOString() });
  write("tokens.json", tokens);
  return token;
}

export function verifyToken(token) {
  if (!token) return null;
  const tokens = read("tokens.json", []);
  const t = tokens.find((x) => x.token === token);
  if (!t || Date.now() > t.expiresAt) return null;
  return findUser(t.userId);
}

export function revokeToken(token) {
  const tokens = read("tokens.json", []);
  write("tokens.json", tokens.filter((t) => t.token !== token));
}

export function publicUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, createdAt: u.createdAt };
}

export function initStorage() {
  if (fs.existsSync(DATA_DIR)) {
    fs.readdirSync(DATA_DIR).forEach((f) => {
      if (f.endsWith(".json")) cache[f] = read(f);
    });
  }
}
