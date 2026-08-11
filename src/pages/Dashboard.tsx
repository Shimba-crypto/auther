import { useState } from "react";
import { usePageTitle } from "../lib/usePageTitle";

const APPS = [
  { name: "JohnWeb", url: "https://johnweb-qncu.onrender.com", desc: "ECZ past papers platform", emoji: "📚", grad: "from-sky-500 to-blue-600" },
  { name: "ShimSearch", url: "https://shimsearch.onrender.com", desc: "Search for Zambian education", emoji: "🔎", grad: "from-emerald-500 to-teal-600" },
  { name: "ShimbaData", url: "https://shimbadata.onrender.com", desc: "Public data API", emoji: "📊", grad: "from-amber-500 to-orange-600" },
  { name: "NexasPay", url: "https://nexas-pay.onrender.com", desc: "Payments & wallet", emoji: "💳", grad: "from-fuchsia-500 to-purple-600" },
];

export default function Dashboard({ token, user }: { token: string; user: any }) {
  usePageTitle("Dashboard");
  const [entering, setEntering] = useState<string | null>(null);

  function enter(a: (typeof APPS)[number]) {
    setEntering(a.name);
    window.location.href = `${a.url}/api/auth/sso?token=${token}`;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">
            {user?.name ? <>{user.name} — </> : null}signed in as <span className="text-slate-300">{user?.email}</span>
          </p>
        </div>
        <span className="glass text-xs font-medium text-emerald-300 px-3.5 py-1.5 rounded-full flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
          Account active
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {APPS.map((a) => (
          <button key={a.name} onClick={() => enter(a)} disabled={entering === a.name}
            className={`glass rounded-2xl p-5 text-left card-hover ${entering === a.name ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between">
              <span className={`w-12 h-12 rounded-xl bg-gradient-to-br ${a.grad} flex items-center justify-center text-2xl shadow-lg`}>
                {a.emoji}
              </span>
              <span className="text-xs text-indigo-300 font-medium flex items-center gap-1">
                {entering === a.name ? "Signing you in…" : "Sign in with Auther →"}
              </span>
            </div>
            <h3 className="font-bold text-lg mt-4 text-white">{a.name}</h3>
            <p className="text-sm text-slate-400 mt-0.5">{a.desc}</p>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-600 mt-6 text-center">
        SSO links carry your session securely to each app — no passwords re-entered.
      </p>
    </div>
  );
}
