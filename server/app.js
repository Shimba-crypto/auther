import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { createHmac, randomBytes } from "crypto";
import { listUsers, createUser, verifyCredentials, issueToken, verifyToken, revokeToken, publicUser, findUserByEmail, findUser, initStorage, read, write } from "./storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "..", "dist");

const app = express();
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: "10kb" }));
app.set("trust proxy", true);

// Rate limiting (simple in-memory)
const attempts = new Map();
function rateLimit(windowMs, max) {
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    if (!attempts.has(ip)) attempts.set(ip, []);
    const hits = attempts.get(ip).filter((t) => now - t < windowMs);
    attempts.set(ip, hits);
    if (hits.length >= max) return res.status(429).json({ error: "too many attempts" });
    hits.push(now);
    next();
  };
}

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.removeHeader("X-Powered-By");
  next();
});

// Auth middleware: check cookie OR header
function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token || req.headers["x-auth-token"] || req.query.token;
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: "login required" });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const token = req.cookies?.auth_token || req.headers["x-auth-token"];
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: "login required" });
  if (user.role !== "admin" && user.role !== "super_admin") return res.status(403).json({ error: "admin only" });
  req.user = user;
  next();
}

// Health
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), users: listUsers().length });
});

// Register
app.post("/api/auth/register", rateLimit(15 * 60 * 1000, 5), (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "name, email, password required" });
  const result = createUser({ name, email, password });
  if (result.error) return res.status(409).json(result);
  // Auto-login
  const token = issueToken(result.user.id);
  res.cookie("auth_token", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000 });
  res.status(201).json({ token, user: result.user });
});

// Login
app.post("/api/auth/login", rateLimit(15 * 60 * 1000, 5), (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });
  const user = verifyCredentials(email, password);
  if (!user) return res.status(401).json({ error: "invalid credentials" });
  const token = issueToken(user.id);
  res.cookie("auth_token", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000 });
  res.json({ token, user: publicUser(user) });
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  const token = req.cookies?.auth_token || req.headers["x-auth-token"];
  if (token) revokeToken(token);
  res.clearCookie("auth_token");
  res.json({ ok: true });
});

// Current user
app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Update profile
app.put("/api/auth/profile", requireAuth, (req, res) => {
  const users = listUsers();
  const idx = users.findIndex((u) => u.id === req.user.id);
  if (idx < 0) return res.status(404).json({ error: "not found" });
  if (req.body.name) users[idx].name = req.body.name.slice(0, 100);
  write("users.json", users);
  res.json({ user: publicUser(users[idx]) });
});

// Admin: list users
app.get("/api/admin/users", requireAdmin, (req, res) => {
  res.json(listUsers().map(publicUser));
});

// SSO: authorize endpoint (OAuth2-style for client apps)
const TRUSTED_APPS = {
  johnweb: "https://johnweb-qncu.onrender.com",
  shimsearch: "https://shimsearch.onrender.com",
  shimbadata: "https://shimbadata.onrender.com",
  nexaspay: "https://nexas-pay.onrender.com",
};

app.get("/sso/authorize", (req, res) => {
  const { client_id, redirect_uri, state } = req.query;
  const appUrl = TRUSTED_APPS[client_id];
  if (!appUrl || !redirect_uri) return res.status(400).json({ error: "invalid client" });

  // Check if user logged in via cookie
  const token = req.cookies?.auth_token;
  const user = verifyToken(token);
  if (!user) {
    return res.redirect(`/login?redirect=${encodeURIComponent(`/sso/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}`)}`);
  }

  // Generate one-time SSO code
  const code = "sso_" + randomBytes(16).toString("hex") + Date.now().toString(36);
  const codes = read("sso-codes.json", {});
  codes[code] = {
    userId: user.id, clientId: client_id, redirectUri: redirect_uri,
    expiresAt: Date.now() + 5 * 60 * 1000, used: false,
  };
  write("sso-codes.json", codes);

  const sep = redirect_uri.includes("?") ? "&" : "?";
  res.redirect(`${redirect_uri}${sep}code=${code}${state ? "&state=" + state : ""}`);
});

// SSO: exchange code for user info
app.post("/sso/exchange", (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: "code required" });
  const codes = read("sso-codes.json", {});
  const record = codes[code];
  if (!record || record.used || Date.now() > record.expiresAt) {
    return res.status(400).json({ error: "invalid or expired code" });
  }
  record.used = true;
  write("sso-codes.json", codes);
  const user = findUser(record.userId);
  if (!user) return res.status(404).json({ error: "user not found" });
  res.json({ ok: true, user: publicUser(user) });
});

// Frontend
app.use(express.static(DIST));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(DIST, "index.html"), (e) => {
    if (e) res.status(200).send("Auther — build the frontend first");
  });
});

export default app;
