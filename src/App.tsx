import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("auth-token") || "");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (token) {
          localStorage.setItem("auth-token", token);
          const r = await fetch("/api/auth/me", { headers: { "X-Auth-Token": token } });
          const d = r.ok ? await r.json() : null;
          setUser(d?.user || null);
        } else {
          localStorage.removeItem("auth-token");
          const r = await fetch("/api/auth/me");
          const d = r.ok ? await r.json() : null;
          setUser(d?.user || null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30 animate-spin">
            🔑
          </div>
          <p className="text-slate-400 mt-4 text-sm font-medium animate-pulse">Loading Auther...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout token={token} user={user} logout={() => setToken("")} />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login onLogin={(t) => setToken(t)} />} />
        <Route path="/register" element={<Register onLogin={(t) => setToken(t)} />} />
        <Route path="/dashboard" element={token ? <Dashboard token={token} user={user} /> : <Login onLogin={(t) => setToken(t)} />} />
        <Route path="/admin" element={token && user?.role === "admin" ? <Admin token={token} /> : <Login onLogin={(t) => setToken(t)} />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
