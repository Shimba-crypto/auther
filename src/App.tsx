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

  useEffect(() => {
    if (token) {
      localStorage.setItem("auth-token", token);
      fetch("/api/auth/me", { headers: { "X-Auth-Token": token } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setUser(d?.user || null))
        .catch(() => setUser(null));
    } else {
      localStorage.removeItem("auth-token");
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then((d) => setUser(d?.user || null)).catch(() => setUser(null));
    }
  }, [token]);

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
