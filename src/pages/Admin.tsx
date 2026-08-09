import { useEffect, useState } from "react";
import { usePageTitle } from "../lib/usePageTitle";

export default function Admin({ token }: { token: string }) {
  usePageTitle("Admin");
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => { fetch("/api/admin/users", { headers: { "X-Auth-Token": token } }).then((r) => r.json()).then(setUsers).catch(() => {}); }, [token]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-sm text-gray-500 mt-1">{users.length} registered users</p>
      <div className="mt-6 border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600"><tr><th className="text-left p-3">Name</th><th className="text-left p-3">Email</th><th className="text-left p-3">Role</th><th className="text-left p-3">Status</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${u.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{u.active ? "active" : "inactive"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
