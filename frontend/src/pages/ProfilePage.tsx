// src/pages/ProfilePage.tsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

type Profile = {
  id: number;
  skin_type?: string | null;
  concerns?: string[] | null;
  sensitivity_notes?: string | null;
  climate?: string | null;
  budget_range?: string | null;
};

const ALL_CONCERNS = [
  "acne",
  "pigmentation",
  "dullness",
  "uneven texture",
  "fine lines",
  "redness",
  "sensitivity",
];

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get("/profile");
        setProfile(res.data);
      } catch (err) {
        console.error(err);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [navigate]);

  function toggleConcern(c: string) {
    if (!profile) return;
    const current = profile.concerns || [];
    const exists = current.includes(c);
    const next = exists ? current.filter((x) => x !== c) : [...current, c];
    setProfile({ ...profile, concerns: next });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    try {
      const res = await api.put("/profile", {
        skin_type: profile.skin_type,
        concerns: profile.concerns || [],
        sensitivity_notes: profile.sensitivity_notes,
        climate: profile.climate,
        budget_range: profile.budget_range,
      });
      setProfile(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <p className="text-slate-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h1 className="text-xl font-semibold">Your Skin Profile</h1>
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

      <main className="max-w-3xl mx-auto p-6">
        <form
          onSubmit={handleSave}
          className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6 space-y-6"
        >
          <div>
            <label className="block text-sm mb-1">Skin type</label>
            <select
              className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm"
              value={profile.skin_type ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, skin_type: e.target.value })
              }
            >
              <option value="">Select skin type</option>
              <option value="oily">Oily</option>
              <option value="dry">Dry</option>
              <option value="combination">Combination</option>
              <option value="normal">Normal</option>
              <option value="sensitive">Sensitive</option>
            </select>
          </div>

          <div>
            <p className="block text-sm mb-1">Primary concerns</p>
            <div className="flex flex-wrap gap-2">
              {ALL_CONCERNS.map((c) => {
                const active = profile.concerns?.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleConcern(c)}
                    className={`px-3 py-1 rounded-full text-xs border ${
                      active
                        ? "bg-emerald-500 text-slate-900 border-emerald-400"
                        : "bg-slate-900 border-slate-600 text-slate-300"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Sensitivity notes</label>
            <textarea
              className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm resize-none h-20"
              placeholder="e.g. avoid fragrance, strong exfoliants, drying alcohols..."
              value={profile.sensitivity_notes ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, sensitivity_notes: e.target.value })
              }
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Climate / city</label>
              <input
                className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm"
                placeholder="e.g. Bangalore, humid"
                value={profile.climate ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, climate: e.target.value })
                }
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        </form>
      </main>
    </div>
  );
}
