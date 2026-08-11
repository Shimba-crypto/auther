import { useEffect, useState } from "react";
import { usePageTitle } from "../lib/usePageTitle";

export default function Admin({ token }: { token: string }) {
  usePageTitle("Admin");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users", { headers: { "X-Auth-Token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const active = users.filter((u) => u.active).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Admin panel</h1>
        <p className="text-slate-400 mt-1">Manage users & access across the ecosystem</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-2xl p-4">
          <p className="text-2xl font-bold text-white">{users.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Total users</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-2xl font-bold text-emerald-400">{active}</p>
          <p className="text-xs text-slate-400 mt-0.5">Active</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-2xl font-bold text-slate-300">{users.length - active}</p>
          <p className="text-xs text-slate-400 mt-0.5">Inactive</p>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-semibold text-white text-sm">All users</h2>
          <span className="text-xs text-slate-500">{loading ? "loading…" : ""}</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500 animate-pulse-glow">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No users yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.03] transition">
                  <td className="px-5 py-3.5 font-medium text-white">{u.name}</td>
                  <td className="px-5 py-3.5 text-slate-400">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${u.role === "admin" ? "bg-purple-500/15 text-purple-300 border border-purple-500/25" : "bg-sky-500/15 text-sky-300 border border-sky-500/25"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg ${u.active ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                      {u.active ? "active" : "inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
