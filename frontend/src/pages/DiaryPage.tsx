// src/pages/DiaryPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

type DiaryEntry = {
  id: number;
  created_at: string;
  rating?: number | null;
  notes?: string | null;
  issues?: string[] | null;
};

export function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [issuesInput, setIssuesInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function fetchEntries() {
    try {
      const res = await api.get<DiaryEntry[]>("/diary?limit=20");
      setEntries(res.data);
    } catch (err) {
      console.error(err);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEntries();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const issues =
      issuesInput.trim().length > 0
        ? issuesInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    try {
      await api.post("/diary", {
        rating: rating ?? null,
        notes: notes || null,
        issues,
      });
      setNotes("");
      setIssuesInput("");
      setRating(undefined);
      await fetchEntries();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail ?? "Failed to save entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h1 className="text-xl font-semibold">Skin Diary</h1>
        <div className="flex gap-3 text-sm">
          <Link
            to="/dashboard"
            className="px-3 py-1 rounded-xl border border-slate-600 hover:bg-slate-800"
          >
            Dashboard
          </Link>
          <Link
            to="/chat"
            className="px-3 py-1 rounded-xl border border-slate-600 hover:bg-slate-800"
          >
            Talk to SkinCoach
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <section className="bg-slate-800/70 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold mb-3">
            Log today&apos;s skin check-in
          </h2>
          <form className="space-y-4" onSubmit={handleSave}>
            <div>
              <label className="block text-sm mb-1">
                Overall rating (1–5)
              </label>
              <select
                className="w-32 rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm"
                value={rating === undefined ? "" : rating}
                onChange={(e) =>
                  setRating(
                    e.target.value ? Number.parseInt(e.target.value, 10) : undefined
                  )
                }
              >
                <option value="">Not set</option>
                {[1, 2, 3, 4, 5].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Issues noticed</label>
              <input
                className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm"
                placeholder="e.g. dryness, redness, breakout (comma separated)"
                value={issuesInput}
                onChange={(e) => setIssuesInput(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Notes</label>
              <textarea
                className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm resize-none h-24"
                placeholder="How did your skin feel today? Did you change anything in your routine?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save entry"}
            </button>
          </form>
        </section>

        <section className="bg-slate-800/70 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold mb-3">Recent entries</h2>
          {loading ? (
            <p className="text-slate-400 text-sm">Loading diary...</p>
          ) : entries.length === 0 ? (
            <p className="text-slate-400 text-sm">
              No diary entries yet. Start by logging today&apos;s check-in above.
            </p>
          ) : (
            <div className="space-y-3">
              {entries.map((e) => (
                <div
                  key={e.id}
                  className="border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-900/60"
                >
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300">
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                    {e.rating != null && (
                      <span className="text-emerald-400 font-medium">
                        {e.rating}/5
                      </span>
                    )}
                  </div>
                  {e.issues && e.issues.length > 0 && (
                    <p className="text-xs text-slate-400 mb-1">
                      Issues: {e.issues.join(", ")}
                    </p>
                  )}
                  {e.notes && (
                    <p className="text-slate-100 whitespace-pre-wrap">
                      {e.notes}
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
