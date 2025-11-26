// src/pages/RoutinePage.tsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

type RoutineStep = {
  step: string;
  product_name: string;
};

type Routine = {
  id: number;
  created_at: string;
  am_steps: RoutineStep[];
  pm_steps: RoutineStep[];
  note?: string | null;
};

export function RoutinePage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const navigate = useNavigate();

  // Fetch history and auto-generate first routine if none exists
  useEffect(() => {
    async function fetchHistoryAndMaybeGenerate() {
      setLoadingList(true);
      setError("");

      try {
        const res = await api.get<Routine[]>("/routine/history");
        const history = res.data;
        setRoutines(history);

        // If user has profile + diary + chat context, but no routine yet,
        // auto-generate the first one.
        if (history.length === 0) {
          await handleGenerate(true);
        }
      } catch (err: any) {
        console.error(err);
        if (err?.response?.status === 401) {
          navigate("/login");
        } else {
          setError(
            err?.response?.data?.detail ?? "Failed to load routine history."
          );
        }
      } finally {
        setLoadingList(false);
      }
    }

    fetchHistoryAndMaybeGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Generate or update routine
  async function handleGenerate(auto = false) {
    setGenerating(true);
    if (!auto) setError("");

    try {
      const res = await api.post<Routine>("/routine/generate", {
        reason: auto ? null : reason || null,
      });

      // Put newest routine at the top
      setRoutines((prev) => [res.data, ...prev]);
      if (!auto) {
        setReason("");
      }
    } catch (err: any) {
      console.error(err);
      if (!auto) {
        setError(
          err?.response?.data?.detail ?? "Failed to generate a new routine."
        );
      }
    } finally {
      setGenerating(false);
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h1 className="text-xl font-semibold">Your Routines</h1>
        <div className="flex gap-3 text-sm">
          <Link
            to="/dashboard"
            className="px-3 py-1 rounded-xl border border-slate-600 hover:bg-slate-800"
          >
            Dashboard
          </Link>
          <Link
            to="/profile"
            className="px-3 py-1 rounded-xl border border-slate-600 hover:bg-slate-800"
          >
            Edit Profile
          </Link>
          <Link
            to="/diary"
            className="px-3 py-1 rounded-xl border border-slate-600 hover:bg-slate-800"
          >
            Skin Diary
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Generate / update section */}
        <section className="bg-slate-800/70 rounded-2xl p-6 border border-slate-700 space-y-3">
          <h2 className="text-lg font-semibold mb-1">
            Generate or update your routine
          </h2>
          <p className="text-xs text-slate-400 mb-2">
            After you’ve talked to SkinCoach and filled your skin profile, a
            baseline routine is created here. If later your skin changes (more
            dryness, breakouts, irritation), describe it briefly and generate an
            updated routine. Older routines stay saved with their date.
          </p>

          <textarea
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm resize-none h-20"
            placeholder="Optional: why do you want to update your routine? e.g. “Increased dryness and redness after current cleanser.”"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <button
            onClick={() => handleGenerate(false)}
            disabled={generating}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold disabled:opacity-60"
          >
            {generating ? "Generating new routine..." : "Generate / Update routine"}
          </button>

          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
        </section>

        {/* History section */}
        <section className="bg-slate-800/70 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold mb-3">Routine history</h2>

          {loadingList ? (
            <p className="text-sm text-slate-300">
              Loading your routines...
            </p>
          ) : routines.length === 0 ? (
            <p className="text-sm text-slate-400">
              No routines yet. Once SkinCoach has enough information from your
              profile and diary, your first routine will appear here.
            </p>
          ) : (
            <div className="space-y-4">
              {routines.map((r) => (
                <div
                  key={r.id}
                  className="border border-slate-700 rounded-xl p-4 bg-slate-900/70"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold">
                      Date – {formatDate(r.created_at)}
                    </span>
                    <span className="text-xs text-slate-400">
                      Routine ID: {r.id}
                    </span>
                  </div>

                  {/* AM */}
                  <div className="mb-2">
                    <p className="text-sm font-semibold mb-1">AM routine:</p>
                    {r.am_steps.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No AM steps recorded.
                      </p>
                    ) : (
                      <ul className="text-sm space-y-1">
                        {r.am_steps.map((s, idx) => (
                          <li key={idx}>
                            {idx + 1}. {s.step}
                            {s.product_name && ` – ${s.product_name}`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* PM */}
                  <div className="mb-2">
                    <p className="text-sm font-semibold mb-1">PM routine:</p>
                    {r.pm_steps.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No PM steps recorded.
                      </p>
                    ) : (
                      <ul className="text-sm space-y-1">
                        {r.pm_steps.map((s, idx) => (
                          <li key={idx}>
                            {idx + 1}. {s.step}
                            {s.product_name && ` – ${s.product_name}`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {r.note && (
                    <p className="mt-1 text-xs text-slate-300">
                      <span className="font-semibold">Note:</span> {r.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
