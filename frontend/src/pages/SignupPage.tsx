import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

export function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.post("/auth/signup", {
        email,
        password,
        full_name: fullName,
      });

      setSuccess("Account created! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail ?? "Signup failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <div className="w-full max-w-md bg-slate-800/80 p-8 rounded-2xl shadow-xl border border-slate-700">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          Create your SkinCoach account
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm mb-1">Full name</label>
            <input
              className="w-full rounded-xl px-3 py-2 bg-slate-900 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

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
              autoComplete="new-password"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-emerald-400 text-sm">{success}</p>}

          <button
            type="submit"
            className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold"
          >
            Sign up
          </button>
        </form>

        <p className="mt-4 text-sm text-center">
          Already have an account?{" "}
          <Link className="text-emerald-300 hover:underline" to="/login">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
