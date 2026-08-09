import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout({ token, user, logout }: { token?: string; user?: any; logout?: () => void }) {
  const loc = useLocation();
  const nav = (to: string, label: string) => (
    <Link to={to} className={`px-4 py-2 rounded-md text-sm font-medium transition ${loc.pathname === to ? "bg-white/10 text-yellow-300" : "text-gray-300 hover:text-white"}`}>{label}</Link>
  );
  return (
    <div className="min-h-screen flex bg-white text-gray-900">
      <aside className="w-56 shrink-0 bg-[#0a2540] text-white flex flex-col border-r border-white/10">
        <div className="px-6 py-5">
          <Link to="/" className="text-lg font-bold tracking-tight">Auth<span className="text-yellow-400">er</span></Link>
          <p className="text-[11px] text-gray-400 mt-0.5">One login for ZamAI</p>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {nav("/", "Home")}
          {nav("/dashboard", "Dashboard")}
          {user?.role === "admin" && nav("/admin", "Admin")}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-xs text-gray-400">
          {token ? (<div><p className="truncate text-gray-200">{user?.email}</p><button onClick={logout} className="text-yellow-400 hover:underline mt-1">Logout</button></div>) : (<Link to="/login" className="text-gray-200 hover:text-white">Login</Link>)}
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-auto"><Outlet /></main>
    </div>
  );
}
