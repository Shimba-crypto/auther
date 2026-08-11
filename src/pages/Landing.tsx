import { Link } from "react-router-dom";
import { usePageTitle } from "../lib/usePageTitle";

const FEATURES = [
  { i: "🔐", t: "Secure", d: "bcrypt hashing, JWT tokens, httpOnly cookies" },
  { i: "🔑", t: "SSO everywhere", d: "one login across every ZamAI app" },
  { i: "🛡️", t: "Rate limited", d: "5 attempts per 15 minutes per IP" },
  { i: "👤", t: "Admin control", d: "manage users & access from one panel" },
];

const APPS = [
  { name: "JohnWeb", desc: "ECZ past papers platform", emoji: "📚" },
  { name: "ShimSearch", desc: "Search for Zambian education", emoji: "🔎" },
  { name: "ShimbaData", desc: "Public data API", emoji: "📊" },
  { name: "NexasPay", desc: "Payments & wallet", emoji: "💳" },
];

export default function Landing() {
  usePageTitle("");
  return (
    <div className="max-w-5xl mx-auto">
      <section className="text-center pt-16 md:pt-24 pb-14">
        <span className="inline-flex items-center gap-2 text-xs font-medium px-3.5 py-1.5 rounded-full glass text-indigo-300 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
          One account for the entire ZamAI ecosystem
        </span>
        <h1 className="mt-6 text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
          Sign in once.
          <br />
          <span className="gradient-text">Use everything.</span>
        </h1>
        <p className="mt-5 text-slate-400 max-w-xl mx-auto text-lg">
          Auther is the central identity for JohnWeb, ShimSearch, ShimbaData and NexasPay — a single secure account that works across all of them.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link to="/register" className="btn-primary text-white font-semibold text-sm px-6 py-3 rounded-xl">
            Get started free
          </Link>
          <Link to="/login" className="text-sm font-medium px-6 py-3 rounded-xl glass hover:border-indigo-400/50 text-slate-200 transition">
            Log in
          </Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-14">
        {FEATURES.map((f) => (
          <div key={f.t} className="glass rounded-2xl p-5 card-hover">
            <div className="text-2xl mb-3">{f.i}</div>
            <h3 className="font-semibold text-white">{f.t}</h3>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">{f.d}</p>
          </div>
        ))}
      </section>

      <section className="glass rounded-2xl p-6 md:p-8 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-bold text-lg text-white">Works with</h2>
          <Link to="/dashboard" className="text-xs text-indigo-300 hover:text-indigo-200 font-medium">Try the dashboard →</Link>
        </div>
        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {APPS.map((a) => (
            <div key={a.name} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition">
              <span className="text-2xl animate-floaty">{a.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-white">{a.name}</p>
                <p className="text-xs text-slate-500">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
