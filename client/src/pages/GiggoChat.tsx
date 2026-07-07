import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Loader2, Bot, User } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const SYSTEM_PROMPT = `Þú ert Gummi — persónulegur AI aðstoðarmaður og þjónustufulltrúi.

Your role is to:
1. Hjálpaðu hugsanlegum viðskiptavinum að skilja hvað Gummi getur afhent þeim
2. Ask clarifying questions to understand their needs
3. Suggest the right service for their situation
4. Collect enough information to create a proper project brief
5. Be warm, professional, and direct — like a sharp account manager at a top agency

8 þjónustur Gumma:
- Website & App Development (landing pages, SaaS apps, e-commerce, client portals) — 2–5 days
- Research & Market Analysis (competitive analysis, market research, due diligence) — 1–2 days
- Marketing Content & Campaigns (blog posts, email sequences, ad copy, social media) — 1–3 days
- Business Proposals & Documents (proposals, business plans, processes, grant applications) — same day to 2 days
- Presentation Decks (investor meetings, sales pitches, board presentations) — 1–2 days
- Data Analysis & Spreadsheets (Excel reports, dashboards, financial models) — same day to 2 days
- Social Media Content Packages (LinkedIn, Twitter, newsletters, Instagram) — 1–2 days
- Lead Research & Prospect Lists (B2B lists, competitor clients, investment targets) — same day to 1 day

Pricing: Starter from $29/project. Growth $99/month unlimited. Studio = custom.

Kosturinn við Gumma: Við finnum besta tilboð mannlegrar stofnunar OG afhentum sömu vinnu á 50% lægra verði með AI.

Svaraðu alltaf á íslensku nema viðskiptavinurinn tali við þig á öðru tungumáli.
Always end your first reply by asking: "What are you working on?" or an appropriate follow-up question.
Keep replies short and conversational. Use markdown sparingly.`;

const WELCOME_MESSAGE = `Hæ! Ég er Gummi, persónulegur AI aðstoðarmaður þinn.

We're an AI-powered agency — you describe what you need and we deliver the finished work. Not a draft. Not a concept. The actual deliverable.

Whether you need a website built, a research report written, a marketing campaign mapped out, or a proposal put together — we handle it end to end.

Við finnum einnig besta stofnanatilboðið fyrir verkefnið þitt og afhentum sömu vinnu á 50% lægra verði.

**What are you working on?**`;

type Message = { role: "user" | "assistant"; content: string };

export default function GiggoChat() {
  const sessionId = useRef(`chat-${Date.now()}`);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-5");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: models } = trpc.chat.models.useQuery();

  const sendMessage = trpc.chat.send.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
      setLoading(false);
    },
    onError: () => {
      toast.error("Failed to get a response. Please try again.");
      setLoading(false);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    sendMessage.mutate({
      sessionId: sessionId.current,
      message: text,
      model: selectedModel,
      history: [
        { role: "system", content: SYSTEM_PROMPT },
        ...newMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
      ],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0C0C0C", paddingTop: "3.5rem" }}>
      {/* Header */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 sm:px-6 h-14 border-b gap-2"
        style={{ background: "rgba(12,12,12,0.95)", backdropFilter: "blur(12px)", borderColor: "rgba(215,226,234,0.08)" }}
      >
        <Link href="/">
          <button
            className="flex items-center gap-1.5 text-xs sm:text-sm transition-opacity flex-shrink-0 hover:opacity-70"
            style={{ color: "rgba(215,226,234,0.5)", background: "none", border: "none", cursor: "pointer", fontFamily: "'Kanit',sans-serif" }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </Link>

        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#7621B0,#B600A8)" }}
          >
            <Bot size={14} style={{ color: "#fff" }} strokeWidth={2.5} />
          </div>
          <span className="hidden sm:block font-bold uppercase tracking-wider text-sm" style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>
            Gummi AI
          </span>
        </div>

        {/* Model selector */}
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-lg outline-none max-w-[120px] sm:max-w-none"
          style={{
            background: "rgba(215,226,234,0.06)",
            border: "1px solid rgba(215,226,234,0.1)",
            color: "rgba(215,226,234,0.5)",
            fontFamily: "'Kanit',sans-serif",
          }}
        >
          <option value="claude-sonnet-4-5">Sonnet 4.5</option>
          <option value="claude-opus-4-5">Opus 4.5</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4o-mini">GPT-4o mini</option>
          <option value="gemini-2.0-flash">Gemini Flash</option>
          {models?.map((m: { id: string }) => (
            !["claude-sonnet-4-5","claude-opus-4-5","gpt-4o","gpt-4o-mini","gemini-2.0-flash"].includes(m.id) && (
              <option key={m.id} value={m.id}>{m.id}</option>
            )
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">
        <div className="flex flex-col gap-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                style={{
                  background: msg.role === "assistant"
                    ? "linear-gradient(135deg,#7621B0,#B600A8)"
                    : "rgba(215,226,234,0.08)",
                  border: msg.role === "user" ? "1px solid rgba(215,226,234,0.1)" : "none",
                }}
              >
                {msg.role === "assistant" ? (
                  <Bot size={16} style={{ color: "#fff" }} />
                ) : (
                  <User size={16} style={{ color: "rgba(215,226,234,0.5)" }} />
                )}
              </div>

              {/* Bubble */}
              <div
                className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                style={{
                  background: msg.role === "assistant" ? "rgba(215,226,234,0.05)" : "rgba(182,0,168,0.1)",
                  border: `1px solid ${msg.role === "assistant" ? "rgba(215,226,234,0.08)" : "rgba(182,0,168,0.2)"}`,
                  color: "#D7E2EA",
                  fontFamily: "'Kanit',sans-serif",
                  whiteSpace: "pre-wrap",
                  borderRadius: msg.role === "assistant" ? "4px 18px 18px 18px" : "18px 4px 18px 18px",
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#7621B0,#B600A8)" }}
              >
                <Bot size={16} style={{ color: "#fff" }} />
              </div>
              <div
                className="px-4 py-3 rounded-2xl flex items-center gap-2"
                style={{ background: "rgba(215,226,234,0.05)", border: "1px solid rgba(215,226,234,0.08)", borderRadius: "4px 18px 18px 18px" }}
              >
                <Loader2 size={14} className="animate-spin" style={{ color: "#B600A8" }} />
                <span className="text-sm" style={{ color: "rgba(215,226,234,0.4)", fontFamily: "'Kanit',sans-serif" }}>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div
        className="sticky bottom-0 px-4 py-4 border-t"
        style={{ background: "rgba(12,12,12,0.95)", backdropFilter: "blur(12px)", borderColor: "rgba(215,226,234,0.08)" }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="flex items-end gap-3 p-3 rounded-xl"
            style={{ background: "rgba(215,226,234,0.04)", border: "1px solid rgba(215,226,234,0.1)" }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you need..."
              rows={1}
              className="flex-1 resize-none outline-none text-sm bg-transparent"
              style={{
                color: "#D7E2EA",
                fontFamily: "'Kanit',sans-serif",
                maxHeight: "120px",
                lineHeight: 1.6,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                background: input.trim() && !loading
                  ? "linear-gradient(135deg,#7621B0,#B600A8)"
                  : "rgba(215,226,234,0.06)",
                border: "none",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              }}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" style={{ color: "rgba(215,226,234,0.4)" }} />
              ) : (
                <Send size={16} style={{ color: input.trim() ? "#fff" : "rgba(215,226,234,0.2)" }} />
              )}
            </button>
          </div>
          <p className="text-xs text-center mt-2" style={{ color: "rgba(215,226,234,0.2)", fontFamily: "'Kanit',sans-serif" }}>
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
