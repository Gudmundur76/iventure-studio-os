import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Send, Bot, User, ChevronDown, Sparkles, Terminal, RefreshCw } from "lucide-react";
import { Streamdown } from "streamdown";
import IVPageHeader from "@/components/IVPageHeader";

const SESSION_ID = "default-session-" + Date.now();

interface Message {
  role: "user" | "assistant";
  content: string;
  model?: string;
}

export default function CommandCentre() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "**iVenture Studio OS** — Command Centre online.\n\nI am your AI orchestrator. I can help you:\n- Route tasks to the right VMOA agent\n- Analyse financial, legal, or marketing intelligence\n- Query the VIC Cortex knowledge base\n- Manage your client portfolio\n\nWhat would you like to accomplish today?" }
  ]);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-5");
  const [modelOpen, setModelOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: models = [] } = trpc.chat.models.useQuery();
  const sendMutation = trpc.chat.send.useMutation();
  const seedMutation = trpc.seed.run.useMutation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput("");
    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    try {
      const result = await sendMutation.mutateAsync({
        sessionId: SESSION_ID,
        message: text,
        model: selectedModel,
        history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      });
      setMessages(prev => [...prev, { role: "assistant", content: result.content, model: result.model ?? selectedModel }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Connection error. Please try again." }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const displayModels = models.length > 0 ? models.map((m: {id: string}) => m.id) : [
    "claude-sonnet-4-5", "claude-opus-4-5", "gpt-5", "gemini-2.5-pro", "deepseek-v3"
  ];

  return (
    <div className="flex flex-col h-full">
      <IVPageHeader
        title="Command Centre"
        subtitle="Streaming AI interface — route tasks to any VMOA agent"
        badge="LIVE"
        badgeColor="var(--iv-green)"
        actions={
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: "rgba(0,180,216,0.1)", color: "var(--iv-blue)", border: "1px solid rgba(0,180,216,0.3)" }}
          >
            <RefreshCw size={12} className={seedMutation.isPending ? "animate-spin" : ""} />
            {seedMutation.isPending ? "Seeding..." : seedMutation.isSuccess ? "Seeded ✓" : "Seed Demo Data"}
          </button>
        }
      />

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: msg.role === "user" ? "var(--iv-blue)" : "var(--iv-surface-2)",
                border: msg.role === "assistant" ? "1px solid var(--iv-border)" : "none",
              }}
            >
              {msg.role === "user" ? <User size={14} color="var(--iv-navy)" /> : <Bot size={14} color="var(--iv-blue)" />}
            </div>
            <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              {msg.role === "assistant" && msg.model && (
                <span className="text-xs font-mono" style={{ color: "var(--iv-text-muted)" }}>{msg.model}</span>
              )}
              <div
                className="px-4 py-3 rounded-2xl text-sm"
                style={{
                  backgroundColor: msg.role === "user" ? "var(--iv-blue)" : "var(--iv-surface)",
                  color: msg.role === "user" ? "var(--iv-navy)" : "var(--iv-text)",
                  border: msg.role === "assistant" ? "1px solid var(--iv-border)" : "none",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  fontWeight: msg.role === "user" ? 500 : 400,
                }}
              >
                {msg.role === "assistant" ? (
                  <Streamdown className="prose prose-invert prose-sm max-w-none">{msg.content}</Streamdown>
                ) : (
                  <span>{msg.content}</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {sendMutation.isPending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--iv-surface-2)", border: "1px solid var(--iv-border)" }}>
              <Bot size={14} color="var(--iv-blue)" />
            </div>
            <div className="px-4 py-3 rounded-2xl" style={{ backgroundColor: "var(--iv-surface)", border: "1px solid var(--iv-border)" }}>
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full iv-pulse" style={{ backgroundColor: "var(--iv-blue)", animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-6 pb-6 pt-3 shrink-0" style={{ borderTop: "1px solid var(--iv-border)" }}>
        {/* Model selector */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={12} style={{ color: "var(--iv-blue)" }} />
          <span className="text-xs" style={{ color: "var(--iv-text-muted)" }}>Model:</span>
          <div className="relative">
            <button
              onClick={() => setModelOpen(!modelOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors"
              style={{ backgroundColor: "var(--iv-surface)", color: "var(--iv-blue)", border: "1px solid var(--iv-border)" }}
            >
              {selectedModel}
              <ChevronDown size={10} />
            </button>
            {modelOpen && (
              <div className="absolute bottom-full mb-1 left-0 z-50 rounded-lg overflow-hidden shadow-xl min-w-[200px]" style={{ backgroundColor: "var(--iv-surface-2)", border: "1px solid var(--iv-border)" }}>
                {displayModels.slice(0, 12).map((m: string) => (
                  <button
                    key={m}
                    onClick={() => { setSelectedModel(m); setModelOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-mono transition-colors hover:bg-white/5"
                    style={{ color: m === selectedModel ? "var(--iv-blue)" : "var(--iv-text)" }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <div className="w-1.5 h-1.5 rounded-full iv-pulse" style={{ backgroundColor: "var(--iv-green)" }} />
            <span className="text-xs" style={{ color: "var(--iv-text-muted)" }}>LiteLLM Gateway</span>
          </div>
        </div>
        {/* Text input */}
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Route a task, ask a question, or command an agent..."
              rows={1}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                backgroundColor: "var(--iv-surface)",
                color: "var(--iv-text)",
                border: "1px solid var(--iv-border)",
                fontFamily: "'Space Grotesk', sans-serif",
                maxHeight: "120px",
              }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 120) + "px";
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0"
            style={{
              backgroundColor: input.trim() && !sendMutation.isPending ? "var(--iv-blue)" : "var(--iv-surface)",
              color: input.trim() && !sendMutation.isPending ? "var(--iv-navy)" : "var(--iv-text-muted)",
              border: "1px solid var(--iv-border)",
            }}
          >
            <Send size={15} />
          </button>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: "var(--iv-text-muted)", opacity: 0.6 }}>
          <Terminal size={10} className="inline mr-1" />
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  );
}

