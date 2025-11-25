import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const res = await api.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      localStorage.setItem("token", res.data.access_token);
      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail ?? "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <div className="w-full max-w-md bg-slate-800/80 p-8 rounded-2xl shadow-xl border border-slate-700">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          SkinCoach Login
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              className="w-full rounded-xl px-3 py-2 bg-slate-900 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              className="w-full rounded-xl px-3 py-2 bg-slate-900 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold"
          >
            Log in
          </button>
        </form>

        <p className="mt-4 text-sm text-center">
          New here?{" "}
          <Link className="text-emerald-300 hover:underline" to="/signup">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
