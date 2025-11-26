// src/pages/ChatPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

type Message = { role: "user" | "assistant"; text: string };

type ChatMessageFromApi = {
  role: "user" | "assistant";
  text: string;
  created_at: string;
};

// Types for possible JSON routine structure
type ChatProduct = {
  name: string;
  category?: string;
  ingredients?: string;
};

type ChatRoutineStep = {
  step: string;
  description?: string;
  products?: ChatProduct[];
};

type ChatRoutine = {
  am_steps?: ChatRoutineStep[];
  pm_steps?: ChatRoutineStep[];
  notes?: string;
};

function formatRoutineJsonToText(raw: string): string {
  let text = raw.trim();

  // Strip ```json ... ``` fences if present
  if (text.startsWith("```")) {
    const lines = text.split("\n");
    if (lines[0].startsWith("```")) {
      lines.shift();
    }
    if (lines[lines.length - 1].startsWith("```")) {
      lines.pop();
    }
    text = lines.join("\n").trim();
  }

  // Try to keep only the JSON object
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1).trim();
  }

  try {
    const data = JSON.parse(text) as ChatRoutine;
    const { am_steps, pm_steps, notes } = data;

    if (!am_steps && !pm_steps) return raw;

    const lines: string[] = [];
    lines.push("Here’s a routine I recommend based on your profile and diary:\n");

    if (am_steps && am_steps.length > 0) {
      lines.push("AM Routine:");
      am_steps.forEach((step, idx) => {
        lines.push(`${idx + 1}. ${step.step}`);
        if (step.description) {
          lines.push(`   - ${step.description}`);
        }
        if (step.products && step.products.length > 0) {
          step.products.forEach((p) => {
            lines.push(`   • Product: ${p.name}`);
          });
        }
      });
      lines.push("");
    }

    if (pm_steps && pm_steps.length > 0) {
      lines.push("PM Routine:");
      pm_steps.forEach((step, idx) => {
        lines.push(`${idx + 1}. ${step.step}`);
        if (step.description) {
          lines.push(`   - ${step.description}`);
        }
        if (step.products && step.products.length > 0) {
          step.products.forEach((p) => {
            lines.push(`   • Product: ${p.name}`);
          });
        }
      });
      lines.push("");
    }

    if (notes) {
      lines.push("Notes:");
      lines.push(notes);
    }

    return lines.join("\n");
  } catch {
    return raw;
  }
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const navigate = useNavigate();

  // Load chat history from backend on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await api.get<ChatMessageFromApi[]>("/chat/history");
        const formatted: Message[] = res.data.map((m) => ({
          role: m.role,
          text: m.role === "assistant" ? formatRoutineJsonToText(m.text) : m.text,
        }));
        setMessages(formatted);
      } catch (err: any) {
        console.error(err);
        if (err?.response?.status === 401) {
          navigate("/login");
        }
      } finally {
        setLoadingHistory(false);
      }
    }

    loadHistory();
  }, [navigate]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const newMessage: Message = { role: "user", text: input.trim() };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/chat", {
        message: newMessage.text,
        session_id: "ignored-on-backend",
      });

      const rawResponse: string = res.data.response;
      const formatted = formatRoutineJsonToText(rawResponse);

      const reply: Message = {
        role: "assistant",
        text: formatted,
      };
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      console.error(err);
      const reply: Message = {
        role: "assistant",
        text: "Oops, something went wrong while talking to SkinCoach.",
      };
      setMessages((prev) => [...prev, reply]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">SkinCoach</h1>
          <p className="text-xs text-slate-400">
            Personal skincare companion powered by agents
          </p>
        </div>
        <Link
          to="/dashboard"
          className="text-sm px-3 py-1 rounded-xl border border-slate-600 hover:bg-slate-800"
        >
          Back to Dashboard
        </Link>
      </header>

      <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto p-4 gap-4">
        <div className="flex-1 overflow-y-auto space-y-3">
          {loadingHistory && messages.length === 0 && (
            <div className="text-center text-sm text-slate-400 mt-10">
              Loading your previous conversation...
            </div>
          )}

          {!loadingHistory && messages.length === 0 && (
            <div className="text-center text-sm text-slate-400 mt-10">
              Start by telling SkinCoach your skin type and main concern, e.g.
              <br />
              <span className="italic">
                “I have dry, sensitive skin and dullness. Help me with a
                routine.”
              </span>
            </div>
          )}

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`max-w-[80%] px-4 py-2 rounded-2xl whitespace-pre-wrap break-words ${
                m.role === "user"
                  ? "ml-auto bg-emerald-500 text-slate-900"
                  : "mr-auto bg-slate-800"
              }`}
            >
              {m.text}
            </div>
          ))}

          {loading && (
            <div className="mr-auto bg-slate-800 rounded-2xl px-4 py-2 text-sm text-slate-300 animate-pulse">
              SkinCoach is thinking...
            </div>
          )}
        </div>

        <div className="border border-slate-700 rounded-2xl p-3 bg-slate-800/60">
          <textarea
            className="w-full bg-transparent outline-none resize-none h-20 text-sm"
            placeholder="Ask SkinCoach about your routine, products, or skin concerns..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex justify-end">
            <button
              className="px-4 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-medium disabled:opacity-40"
              onClick={sendMessage}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
