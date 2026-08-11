import { Link, Outlet, useLocation } from "react-router-dom";

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICONS: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9 21v-6h6v6",
  dashboard: "M4 13h6V4H4v9Zm10 7h6v-7h-6v7ZM4 21h6v-4H4v4Zm10-13h6V4h-6v4Z",
  shield: "M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3ZM9 12l2 2 4-4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0",
  logout: "M15 12H4m0 0 3-3m-3 3 3 3M9 5V3h11v18H9v-2",
  lock: "M6 11V8a6 6 0 0 1 12 0v3M4 11h16v10H4V11Zm8 3v4",
  key: "M14 10a6 6 0 1 1-3.5-5.5L13 7l2-2 2 2-1 1 2 2-2 2-1.5-1.5",
  zap: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
  cloud: "M6.5 19a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 8.6 4 4 0 0 1 17.5 19h-11Z",
};

export default function Layout({ token, user, logout }: { token?: string; user?: any; logout?: () => void }) {
  const loc = useLocation();
  const items = [
    { to: "/", label: "Home", icon: "home" },
    { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin", icon: "shield" }] : []),
  ];

  return (
    <div className="min-h-screen flex text-gray-200">
      <aside className="w-60 shrink-0 hidden md:flex flex-col border-r border-white/10 bg-[#0b1120]/80 backdrop-blur-xl">
        <div className="px-6 py-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition">
              <Icon d={ICONS.key} size={17} />
            </span>
            <span className="text-xl font-bold tracking-tight">
              Auth<span className="gradient-text">er</span>
            </span>
          </Link>
          <p className="text-[11px] text-slate-500 mt-1.5 ml-11">One login for ZamAI</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {items.map((it) => (
            <Link key={it.to} to={it.to}
              className={`nav-link flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${loc.pathname === it.to ? "active" : "text-slate-400"}`}>
              <Icon d={ICONS[it.icon]} size={17} />
              {it.label}
            </Link>
          ))}
        </nav>

        <div className="px-5 py-5 border-t border-white/10">
          {token ? (
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-sm font-bold shrink-0">
                {(user?.name || user?.email || "U")[0].toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-slate-200">{user?.name || user?.email}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <button onClick={logout} title="Logout" className="text-slate-400 hover:text-red-400 transition">
                <Icon d={ICONS.logout} size={17} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="w-full flex items-center justify-center gap-2 btn-primary text-sm font-semibold px-4 py-2.5 rounded-xl text-white">
              <Icon d={ICONS.user} size={15} />
              Log in
            </Link>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto">
        {/* mobile topbar */}
        <div className="md:hidden sticky top-0 z-20 glass-strong px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Icon d={ICONS.key} size={15} />
            </span>
            <span className="font-bold">Auth<span className="gradient-text">er</span></span>
          </Link>
          <nav className="flex items-center gap-1">
            {items.map((it) => (
              <Link key={it.to} to={it.to}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${loc.pathname === it.to ? "bg-indigo-500/20 text-indigo-300" : "text-slate-400 hover:text-white"}`}>
                {it.label}
              </Link>
            ))}
            {token && (
              <button onClick={logout} className="ml-1 text-slate-400 hover:text-red-400 p-1.5">
                <Icon d={ICONS.logout} size={16} />
              </button>
            )}
          </nav>
        </div>
        <div className="p-4 md:p-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
