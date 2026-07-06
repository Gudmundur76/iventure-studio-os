import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Loader2, Zap, Bot, User, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const SYSTEM_PROMPT = `Þú ert Gummi Gúrú gervigreindarstuðningurinn — viðmót Gummi Gúrú við viðskiptavini á Íslandi.

Hlutverk þitt er að:
1. Hjálpa mögulegum viðskiptavinum að skilja hvað Gummi Gúrú getur afhent þeim
2. Spyrja skýringarspurninga til að skilja þarfir þeirra
3. Leggja til réttu þjónustuna fyrir þeirra aðstæður
4. Safna nægar upplýsingar til að búa til eiginlega lýsingu
5. Vera hlýr, faglegur og beinlínis — eins og skarpir reikningsstjóri hjá stofunni

8 þjónustur Gummi Gúrú:
- Vefsíður og forritaþróun (lendingarsíður, SaaS forrit, netverslun, viðskiptavinahlið) — 2-5 dagar
- Rannsóknir og markaðsgreining (samkeppnisgreining, markaðsrannsóknir, áreiðanleikakönnun) — 1-2 dagar
- Markaðsefni og herferðir (blogggreinar, tölvupóstkeðjur, auglýsingatextar, samfélagsmiðlar) — 1-3 dagar
- Viðskiptatillögur og skjöl (tillögur, viðskiptaáætlanir, ferlar, styrktarbeiðnir) — sama dag til 2 daga
- Kynningarglærur (fjárfestingafundir, sölukynningu, stjórnarfundir) — 1-2 dagar
- Gagnagreining og töflureiknar (Excel skýrslur, mælaborð, fjármálalíkön) — sama dag til 2 daga
- Samfélagsmiðlar og efnispakkar (LinkedIn, Twitter, fréttabréf, Instagram) — 1-2 dagar
- Viðfangsrannsóknir og listi yfir horfur (B2B listar, samkeppnisviðskiptavinir, fjárfestingamarkmið) — sama dag til 1 dag

Verðlag: Byrjandi frá ISK 49.900/verkefni. Vöxtur ISK 149.900/mánuð. Stofuáætlun = sérsniðið.

Svaraðu alltaf á íslensku nema viðskiptavinurinn tali við þig á öðru tungumáli.
Ljúktu alltaf fyrstu svari þínu með því að spyrja: "Hvað ertu að vinna í?" eða viðeigandi eftirfylgnispurningu.
Haltu svörum stuttum og samræðulegum. Notaðu markdown sparsamlega.`;

const WELCOME_MESSAGE = `Hæ! Ég er Gummi Gúrú aðstoðarmaðurinn.

Við erum íslenska gervigreindarstofa — við tökum lýsingu þína og afhendum fullklárað verk. Ekki drög. Ekki hugmyndir. Hið eiginlega verk.

Hvort sem þú þarft vefsíðu smíðaða, rannsóknarskýrslu skrifaða, markaðsherferð dregna upp eða tillögu sett saman — við sjáum um það frá upphafi til enda.

**Hvað ertu að vinna í?**`;

type Message = { role: "user" | "assistant"; content: string };

export default function AmplifyChat() {
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
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--amp-black)", paddingTop: "4rem" }}
    >
      {/* Header */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 h-16 border-b"
        style={{ background: "rgba(13,13,13,0.95)", backdropFilter: "blur(12px)", borderColor: "var(--amp-border)" }}
      >
        <Link href="/">
          <button
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: "var(--amp-muted)", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--amp-white)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--amp-muted)")}
          >
            <ArrowLeft size={16} />
            Til baka
          </button>
        </Link>

        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--amp-green)" }}
          >
            <Zap size={14} style={{ color: "var(--amp-black)" }} strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--amp-white)" }}>
            Gummi Gúrú Spjall
          </span>
        </div>

        {/* Model selector */}
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg outline-none"
          style={{
            background: "var(--amp-surface-2)",
            border: "1px solid var(--amp-border)",
            color: "var(--amp-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <option value="claude-sonnet-4-5">claude-sonnet-4-5</option>
          <option value="claude-opus-4-5">claude-opus-4-5</option>
          <option value="gpt-4o">gpt-4o</option>
          <option value="gpt-4o-mini">gpt-4o-mini</option>
          <option value="gemini-2.0-flash">gemini-2.0-flash</option>
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
                  background: msg.role === "assistant" ? "var(--amp-green)" : "var(--amp-surface-2)",
                  border: msg.role === "user" ? "1px solid var(--amp-border)" : "none",
                }}
              >
                {msg.role === "assistant" ? (
                  <Bot size={16} style={{ color: "var(--amp-black)" }} />
                ) : (
                  <User size={16} style={{ color: "var(--amp-muted)" }} />
                )}
              </div>

              {/* Bubble */}
              <div
                className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                style={{
                  background: msg.role === "assistant" ? "var(--amp-surface)" : "rgba(0,255,135,0.1)",
                  border: `1px solid ${msg.role === "assistant" ? "var(--amp-border)" : "rgba(0,255,135,0.2)"}`,
                  color: "var(--amp-white)",
                  fontFamily: "var(--font-body)",
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
                style={{ background: "var(--amp-green)" }}
              >
                <Bot size={16} style={{ color: "var(--amp-black)" }} />
              </div>
              <div
                className="px-4 py-3 rounded-2xl flex items-center gap-2"
                style={{ background: "var(--amp-surface)", border: "1px solid var(--amp-border)", borderRadius: "4px 18px 18px 18px" }}
              >
              <Loader2 size={14} className="animate-spin" style={{ color: "var(--amp-green)" }} />
                <span className="text-sm" style={{ color: "var(--amp-muted)" }}>Hugsa...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div
        className="sticky bottom-0 px-4 py-4 border-t"
        style={{ background: "rgba(13,13,13,0.95)", backdropFilter: "blur(12px)", borderColor: "var(--amp-border)" }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="flex items-end gap-3 p-3 rounded-xl"
            style={{ background: "var(--amp-surface)", border: "1px solid var(--amp-border)" }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Lýstu því sem þú þarft..."
              rows={1}
              className="flex-1 resize-none outline-none text-sm bg-transparent"
              style={{
                color: "var(--amp-white)",
                fontFamily: "var(--font-body)",
                maxHeight: "120px",
                lineHeight: 1.6,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                background: input.trim() && !loading ? "var(--amp-green)" : "var(--amp-surface-2)",
                border: "none",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              }}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" style={{ color: "var(--amp-muted)" }} />
              ) : (
                <Send size={16} style={{ color: input.trim() ? "var(--amp-black)" : "var(--amp-muted-2)" }} />
              )}
            </button>
          </div>
          <p className="text-xs text-center mt-2" style={{ color: "var(--amp-muted-2)" }}>
            Ýttu á Enter til að senda · Shift+Enter fyrir nýja línu
          </p>
        </div>
      </div>
    </div>
  );
}
