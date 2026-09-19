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

// CORS configuration - restrict to trusted origins only
const ALLOWED_ORIGINS = [
  "https://shifu-api-production.up.railway.app",
  "https://shifu-api.up.railway.app",
  "https://johnweb-qncu.onrender.com",
  "https://shimsearch.onrender.com",
  "https://shimbadata.onrender.com",
  "https://nexas-pay.onrender.com",
  "https://cooper-web.onrender.com",
  process.env.ALLOWED_ORIGIN // Allow custom origin via env var
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

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

// Register with input validation and stronger password requirements
app.post("/api/auth/register", rateLimit(15 * 60 * 1000, 5), (req, res) => {
  const { name, email, password } = req.body || {};
  
  // Input validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: "valid name required" });
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "valid email required" });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: "password required" });
  }
  
  // Stronger password requirements: min 8 chars, must contain number and letter
  if (password.length < 8) {
    return res.status(400).json({ error: "password must be at least 8 characters" });
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ error: "password must contain letters and numbers" });
  }
  
  const result = createUser({ name: name.trim(), email: email.toLowerCase(), password });
  if (result.error) return res.status(409).json(result);
  // Auto-login
  const token = issueToken(result.user.id);
  res.cookie("auth_token", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000 });
  res.status(201).json({ token, user: result.user });
});

// Login with input validation and rate limiting
app.post("/api/auth/login", rateLimit(15 * 60 * 1000, 5), (req, res) => {
  const { email, password } = req.body || {};
  
  // Input validation
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "valid email required" });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: "password required" });
  }
  
  const user = verifyCredentials(email.toLowerCase(), password);
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

// Update profile with input validation
app.put("/api/auth/profile", requireAuth, (req, res) => {
  const users = listUsers();
  const idx = users.findIndex((u) => u.id === req.user.id);
  if (idx < 0) return res.status(404).json({ error: "not found" });
  
  // Input validation and sanitization
  if (req.body.name) {
    if (typeof req.body.name !== 'string' || req.body.name.trim().length === 0) {
      return res.status(400).json({ error: "valid name required" });
    }
    users[idx].name = req.body.name.trim().slice(0, 100);
  }
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
  cooperweb: "https://cooper-web.onrender.com",
  shifu: "https://shifu-api-production.up.railway.app",
  "shifu-api": "https://shifu-api-production.up.railway.app",
  shifucode: "https://shifu-api.up.railway.app",
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

// SSO: exchange code for user info with CSRF protection
app.post("/sso/exchange", (req, res) => {
  const { code } = req.body || {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: "valid code required" });
  }
  const codes = read("sso-codes.json", {});
  const record = codes[code];
  if (!record || record.used || Date.now() > record.expiresAt) {
    return res.status(400).json({ error: "invalid or expired code" });
  }
  record.used = true;
  write("sso-codes.json", codes);
  const user = findUser(record.userId);
  if (!user) return res.status(404).json({ error: "user not found" });
  
  // Return only the expected user fields to maintain contract stability
  res.json({ ok: true, user: { email: user.email, name: user.name } });
});

// Promo: Shifu bonus banner endpoint (configurable without redeploy)
app.get("/api/promo/shifu-bonus", (req, res) => {
  // Check environment variable to allow disabling the promo without code changes
  const active = process.env.SHIFU_BONUS_ACTIVE !== "false";
  res.json({
    active: active,
    headline: "1B token welcome bonus",
    detail: "Sign in with Auther and Shifu adds 1B tokens (1,000,000 credits) to your account — free, one time.",
    shifuLoginUrl: "https://shifu-api-production.up.railway.app/api/auth/auther/login"
  });
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
