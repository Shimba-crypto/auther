import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../lib/usePageTitle";

export default function Login({ onLogin }: { onLogin: (t: string) => void }) {
  usePageTitle("Login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setLoading(true);
    const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pass }) });
    const d = await r.json(); setLoading(false);
    if (d.token) { onLogin(d.token); window.location.href = "/dashboard"; }
    else setErr(d.error || "login failed");
  }

  return (
    <div className="max-w-md mx-auto mt-10 md:mt-20">
      <div className="glass-strong rounded-2xl p-8 shadow-2xl shadow-black/40">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/30 animate-floaty">
            🔑
          </div>
          <h1 className="text-2xl font-bold mt-4 text-white">Welcome back</h1>
          <p className="text-sm text-slate-400 mt-1">Log in to your Auther account</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com"
              className="input-dark w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Password</label>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} required placeholder="••••••••"
              className="input-dark w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500" />
          </div>

          {err && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 animate-fade-in">
              {err}
            </p>
          )}

          <button disabled={loading} className="btn-primary w-full text-white text-sm font-semibold py-3 rounded-xl">
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>

        <p className="text-sm text-slate-500 mt-6 text-center">
          No account?{" "}
          <Link to="/register" className="text-indigo-300 font-medium hover:text-indigo-200 hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
