import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { api } from "../api";

type Message = { role: "user" | "assistant"; text: string };

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId] = useState(() => uuidv4());
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // small guard to ensure user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
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
        session_id: sessionId,
      });

      const reply: Message = {
        role: "assistant",
        text: res.data.response,
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
          {messages.length === 0 && (
            <div className="text-center text-sm text-slate-400 mt-10">
              Start by telling SkinCoach your skin type and main concern, e.g.
              <br />
              <span className="italic">
                “I have oily, acne-prone skin. I want a simple routine.”
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
