import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

type User = {
  id: number;
  email: string;
  full_name?: string;
};

export function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await api.get("/auth/me");
        setUser(res.data);
      } catch (err) {
        console.error(err);
        navigate("/login");
      }
    }
    fetchMe();
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h1 className="text-xl font-semibold">SkinCoach Dashboard</h1>
        <button
          onClick={handleLogout}
          className="text-sm px-3 py-1 rounded-xl border border-slate-600 hover:bg-slate-800"
        >
          Logout
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <section className="bg-slate-800/70 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold mb-2">
            Welcome, {user?.full_name || user?.email || "there"} 👋
          </h2>
          <p className="text-sm text-slate-300">
            This is your personal SkinCoach space. You’ll soon see your skin
            profile, routine suggestions, and diary insights here.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            to="/chat"
            className="bg-emerald-500/90 hover:bg-emerald-400 text-slate-900 rounded-2xl p-5 font-medium shadow-lg"
          >
            💬 Talk to SkinCoach
            <p className="mt-1 text-sm text-slate-900/80">
              Ask questions about your routine, products, or skin concerns.
            </p>
          </Link>

          <div className="bg-slate-800/70 rounded-2xl p-5 border border-slate-700 text-sm text-slate-300">
            <p className="font-medium text-slate-100 mb-1">
              Next steps (later):
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Show your saved skin profile</li>
              <li>Display recent diary entries and trends</li>
              <li>Quick buttons to update routine</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
