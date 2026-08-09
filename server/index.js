import fs from "fs";
import path from "path";
import app from "./app.js";
import { initStorage } from "./storage.js";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const eq = t.indexOf("=");
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

const PORT = process.env.PORT || 3001;

async function boot() {
  initStorage();
  app.listen(PORT, () => console.log(`Auther running on port ${PORT}`));
}

boot();
