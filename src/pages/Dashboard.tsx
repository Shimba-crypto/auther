import { useEffect, useState } from "react";
import { usePageTitle } from "../lib/usePageTitle";

export default function Dashboard({ token, user }: { token: string; user: any }) {
  usePageTitle("Dashboard");
  const [apps] = useState([
    { name: "JohnWeb", url: "https://johnweb-qncu.onrender.com", desc: "ECZ past papers platform" },
    { name: "ShimSearch", url: "https://shimsearch.onrender.com", desc: "Search engine for Zambian education" },
    { name: "ShimbaData", url: "https://shimbadata.onrender.com", desc: "Public data API" },
    { name: "NexasPay", url: "https://nexas-pay.onrender.com", desc: "Payments & wallet" },
  ]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {apps.map((a) => (
          <a key={a.name} href={`${a.url}/api/auth/sso?token=${token}`} className="border rounded-lg p-4 hover:border-gray-400 transition">
            <h3 className="font-semibold">{a.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{a.desc}</p>
            <p className="text-xs text-blue-600 mt-2">Sign in with Auther →</p>
          </a>
        ))}
      </div>
    </div>
  );
}
