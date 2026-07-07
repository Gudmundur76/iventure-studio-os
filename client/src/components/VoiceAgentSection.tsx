import { useRef, useState, useCallback, useEffect } from "react";
import { Mic, MicOff, Volume2, Zap, Clock, CheckCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type SessionState = "idle" | "connecting" | "listening" | "speaking" | "error";
type TranscriptLine = { role: "user" | "agent"; text: string };

// ─── Waveform bars ────────────────────────────────────────────────────────────
function Waveform({ active, color }: { active: boolean; color: string }) {
  const bars = 28;
  return (
    <div className="flex items-center gap-[3px] h-10">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all"
          style={{
            width: 3,
            background: color,
            height: active
              ? `${20 + Math.sin(Date.now() / 200 + i * 0.7) * 14 + Math.random() * 8}px`
              : "4px",
            opacity: active ? 0.9 : 0.25,
            animation: active ? `wave-bar ${0.6 + (i % 5) * 0.12}s ease-in-out infinite alternate` : "none",
            animationDelay: `${i * 0.04}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────
export default function VoiceAgentSection() {
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [currentText, setCurrentText] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, currentText]);

  // Play PCM audio chunks from xAI
  const playNextChunk = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;
    const ctx = audioContextRef.current!;
    // xAI sends 24kHz 16-bit mono PCM
    const pcm = new Int16Array(chunk);
    const float32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) float32[i] = pcm[i] / 32768;
    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      playNextChunk();
    };
    source.start();
  }, []);

  const stopSession = useCallback(() => {
    mediaRecorderRef.current?.stop();
    wsRef.current?.close();
    wsRef.current = null;
    mediaRecorderRef.current = null;
    setSessionState("idle");
    setCurrentText("");
  }, []);

  const startSession = useCallback(async () => {
    if (sessionState !== "idle") { stopSession(); return; }
    setSessionState("connecting");
    setTranscript([]);
    setCurrentText("");

    try {
      // Set up AudioContext for playback
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      audioQueueRef.current = [];
      isPlayingRef.current = false;

      // Connect via server-side proxy (proxy adds Authorization header to xAI — key never in browser)
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const proxyUrl = `${proto}//${window.location.host}/api/voice-proxy`;
      const ws = new WebSocket(proxyUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setSessionState("listening");
        // Start microphone capture
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
        const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        mediaRecorderRef.current = mr;
        mr.ondataavailable = async (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            const buf = await e.data.arrayBuffer();
            // Convert to base64 and send as input_audio_buffer.append
            const bytes = new Uint8Array(buf);
            const b64 = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(""));
            ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: b64 }));
          }
        };
        mr.start(250); // 250ms chunks
      };

      ws.onmessage = (raw) => {
        try {
          const event = JSON.parse(raw.data as string) as Record<string, unknown>;
          const type = event.type as string;

          if (type === "response.output_audio.delta") {
            // Decode base64 PCM and queue for playback
            const pcmB64 = event.delta as string;
            const binary = atob(pcmB64);
            const buf = new ArrayBuffer(binary.length);
            const view = new Uint8Array(buf);
            for (let i = 0; i < binary.length; i++) { view[i] = binary.charCodeAt(i); }
            audioQueueRef.current.push(buf);
            setSessionState("speaking");
            playNextChunk();
          } else if (type === "response.output_audio_transcript.delta") {
            setCurrentText(prev => prev + (event.delta as string));
          } else if (type === "response.output_audio_transcript.done") {
            const text = (event.transcript as string) || currentText;
            if (text.trim()) {
              setTranscript(prev => [...prev, { role: "agent", text: text.trim() }]);
            }
            setCurrentText("");
            setSessionState("listening");
          } else if (type === "conversation.item.input_audio_transcription.completed") {
            const text = event.transcript as string;
            if (text?.trim()) {
              setTranscript(prev => [...prev, { role: "user", text: text.trim() }]);
            }
          } else if (type === "error") {
            console.error("xAI WS error:", event);
            setSessionState("error");
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onerror = () => setSessionState("error");
      ws.onclose = () => { if (sessionState !== "idle") setSessionState("idle"); };
    } catch (err) {
      console.error("Voice session error:", err);
      setSessionState("error");
      setTimeout(() => setSessionState("idle"), 3000);
    }
  }, [sessionState, stopSession, playNextChunk, currentText]);

  const isActive = sessionState !== "idle" && sessionState !== "error";
  const btnLabel = {
    idle: "Tala við Gumma",
    connecting: "Tengist...",
    listening: "Hlusta...",
    speaking: "Giggo is speaking",
    error: "Try Again",
  }[sessionState];

  const PILLARS = [
    {
      icon: <Mic size={28} />,
      title: "Raddstýrt",
      body: "Tala við Gumma like you would a colleague. No forms, no briefs, no back-and-forth emails. Just speak.",
    },
    {
      icon: <Zap size={28} />,
      title: "Alltaf til staðar",
      body: "Gummi er í gangi allan sólarhringinn. Byrjaðu lotu hvenær sem er, á hvaða tæki sem er. Engin bið, engin tímasetning.",
    },
    {
      icon: <CheckCircle size={28} />,
      title: "Afhendir verkið",
      body: "Gummi svarar ekki bara spurningum. Hann framkvæmir verkefnið í heild og afhendir fullunna niðurstöðu.",
    },
  ];

  const STEPS = [
    { num: "01", label: "Smelltu á hljóðnemann", desc: "Lýstu því sem þú þarft í venjulegu tali — engin eyðublöð, enginn tölvupóstur." },
    { num: "02", label: "Gummi staðfestir", desc: "Gummi staðfestir lýsinguna þína og byrjar að vinna strax." },
    { num: "03", label: "Gummi framkvæmir", desc: "Gummi vinnur sjálfstætt frá upphafi til enda — rannsakar, byggir, skrifar, afhendir." },
    { num: "04", label: "Þú færð niðurstöðuna", desc: "Fullunna niðurstaðan berst í pósthólf þitt — vefslóð, PDF eða skrá." },
  ];

  return (
    <section
      id="agent-session"
      className="relative py-20 sm:py-28 md:py-36 px-5 sm:px-8 md:px-10 overflow-hidden"
      style={{ background: "#0C0C0C" }}
    >
      {/* Heading */}
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 sm:mb-20">
          <h2
            className="hero-heading font-black uppercase leading-none tracking-tight text-center"
            style={{ fontSize: "clamp(2.5rem,9vw,110px)", fontFamily: "'Kanit',sans-serif" }}
          >
            Tala við Gumma
          </h2>
          <p
            className="text-center mt-4 font-light uppercase tracking-widest"
            style={{ color: "rgba(215,226,234,0.45)", fontSize: "clamp(0.75rem,1.4vw,1rem)", fontFamily: "'Kanit',sans-serif" }}
          >
            Your personal voice agent — live, right now
          </p>
        </div>

        {/* Three pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16 sm:mb-20">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl p-6 sm:p-8 flex flex-col gap-4"
              style={{ background: "rgba(215,226,234,0.04)", border: "1px solid rgba(215,226,234,0.08)" }}
            >
              <div style={{ color: "#B600A8" }}>{p.icon}</div>
              <h3
                className="font-black uppercase"
                style={{ color: "#D7E2EA", fontSize: "clamp(1rem,1.8vw,1.3rem)", fontFamily: "'Kanit',sans-serif" }}
              >
                {p.title}
              </h3>
              <p
                className="font-light leading-relaxed"
                style={{ color: "rgba(215,226,234,0.55)", fontSize: "clamp(0.85rem,1.4vw,1rem)", fontFamily: "'Kanit',sans-serif" }}
              >
                {p.body}
              </p>
            </div>
          ))}
        </div>

        {/* Live voice widget */}
        <div
          className="rounded-3xl overflow-hidden mb-16 sm:mb-20"
          style={{ border: "1px solid rgba(182,0,168,0.25)", background: "rgba(12,12,12,0.9)" }}
        >
          {/* Widget header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid rgba(215,226,234,0.06)", background: "rgba(215,226,234,0.03)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: isActive ? "#22c55e" : "rgba(215,226,234,0.2)",
                  boxShadow: isActive ? "0 0 8px #22c55e" : "none",
                  animation: isActive ? "pulse 1.5s ease-in-out infinite" : "none",
                }}
              />
              <span
                className="font-medium uppercase tracking-widest text-xs"
                style={{ color: "rgba(215,226,234,0.5)", fontFamily: "'Kanit',sans-serif" }}
              >
                {isActive ? sessionState.toUpperCase() : "READY"}
              </span>
            </div>
            <span
              className="text-xs font-mono"
              style={{ color: "rgba(182,0,168,0.6)" }}
            >
              agent_fgrublDXzNDfu5MT
            </span>
          </div>

          {/* Transcript area */}
          <div className="px-6 py-6 min-h-[180px] max-h-[260px] overflow-y-auto flex flex-col gap-4">
            {transcript.length === 0 && !currentText && (
              <div
                className="flex-1 flex items-center justify-center text-center"
                style={{ color: "rgba(215,226,234,0.2)", fontFamily: "'Kanit',sans-serif", fontSize: "0.9rem" }}
              >
                {sessionState === "idle"
                  ? "Click the mic button below to start a live voice session with Giggo"
                  : sessionState === "connecting"
                  ? "Tengist við Gumma..."
                  : "Hlusta..."}
              </div>
            )}
            {transcript.map((line, i) => (
              <div key={i} className={`flex gap-3 ${line.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                  style={{
                    background: line.role === "agent"
                      ? "linear-gradient(135deg,#7621B0,#B600A8)"
                      : "rgba(215,226,234,0.08)",
                    color: "#fff",
                    fontFamily: "'Kanit',sans-serif",
                  }}
                >
                  {line.role === "agent" ? "G" : "U"}
                </div>
                <div
                  className="max-w-[80%] px-4 py-2.5 text-sm leading-relaxed"
                  style={{
                    background: line.role === "agent" ? "rgba(182,0,168,0.08)" : "rgba(215,226,234,0.05)",
                    border: `1px solid ${line.role === "agent" ? "rgba(182,0,168,0.2)" : "rgba(215,226,234,0.08)"}`,
                    borderRadius: line.role === "agent" ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                    color: "#D7E2EA",
                    fontFamily: "'Kanit',sans-serif",
                  }}
                >
                  {line.text}
                </div>
              </div>
            ))}
            {/* Streaming text */}
            {currentText && (
              <div className="flex gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                  style={{ background: "linear-gradient(135deg,#7621B0,#B600A8)", color: "#fff", fontFamily: "'Kanit',sans-serif" }}
                >
                  G
                </div>
                <div
                  className="max-w-[80%] px-4 py-2.5 text-sm leading-relaxed"
                  style={{
                    background: "rgba(182,0,168,0.08)",
                    border: "1px solid rgba(182,0,168,0.2)",
                    borderRadius: "4px 16px 16px 16px",
                    color: "#D7E2EA",
                    fontFamily: "'Kanit',sans-serif",
                  }}
                >
                  {currentText}
                  <span className="inline-block w-1 h-4 ml-1 align-middle animate-pulse" style={{ background: "#B600A8" }} />
                </div>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Waveform + mic button */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-6 px-6 py-5"
            style={{ borderTop: "1px solid rgba(215,226,234,0.06)" }}
          >
            {/* Waveform */}
            <div className="flex-1 flex items-center justify-center sm:justify-start">
              <Waveform active={sessionState === "speaking"} color={sessionState === "speaking" ? "#B600A8" : "rgba(215,226,234,0.3)"} />
            </div>

            {/* Mic button */}
            <button
              onClick={startSession}
              disabled={sessionState === "connecting"}
              className="flex items-center gap-3 px-8 py-3.5 rounded-full font-medium uppercase tracking-widest text-sm transition-all"
              style={{
                background: isActive
                  ? "rgba(182,0,168,0.15)"
                  : "linear-gradient(123deg,#18011F 7%,#B600A8 37%,#7621B0 72%,#BE4C00 100%)",
                border: isActive ? "2px solid rgba(182,0,168,0.5)" : "2px solid transparent",
                color: "#fff",
                fontFamily: "'Kanit',sans-serif",
                boxShadow: isActive ? "none" : "0 0 24px rgba(182,0,168,0.3)",
                cursor: sessionState === "connecting" ? "not-allowed" : "pointer",
                transform: "scale(1)",
                transition: "all 0.2s ease-out",
              }}
              onMouseDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
              onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              {isActive ? <MicOff size={18} /> : <Mic size={18} />}
              {btnLabel}
            </button>

            {/* Volume indicator */}
            <div className="flex items-center gap-2">
              <Volume2 size={16} style={{ color: sessionState === "speaking" ? "#B600A8" : "rgba(215,226,234,0.2)" }} />
              <span
                className="text-xs uppercase tracking-widest"
                style={{ color: "rgba(215,226,234,0.2)", fontFamily: "'Kanit',sans-serif" }}
              >
                {sessionState === "speaking" ? "Speaking" : "Audio"}
              </span>
            </div>
          </div>
        </div>

        {/* How it works — 4 steps */}
        <div>
          <h3
            className="font-black uppercase text-center mb-10 sm:mb-14"
            style={{ color: "#D7E2EA", fontSize: "clamp(1.2rem,3vw,2rem)", fontFamily: "'Kanit',sans-serif", letterSpacing: "0.05em" }}
          >
            Hvernig lota virkar
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {STEPS.map((step) => (
              <div key={step.num} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="font-black leading-none"
                    style={{ color: "rgba(182,0,168,0.4)", fontSize: "clamp(2rem,5vw,3.5rem)", fontFamily: "'Kanit',sans-serif" }}
                  >
                    {step.num}
                  </span>
                  <div className="h-px flex-1" style={{ background: "rgba(215,226,234,0.1)" }} />
                </div>
                <h4
                  className="font-black uppercase"
                  style={{ color: "#D7E2EA", fontSize: "clamp(0.9rem,1.5vw,1.1rem)", fontFamily: "'Kanit',sans-serif" }}
                >
                  {step.label}
                </h4>
                <p
                  className="font-light leading-relaxed"
                  style={{ color: "rgba(215,226,234,0.5)", fontSize: "clamp(0.8rem,1.3vw,0.95rem)", fontFamily: "'Kanit',sans-serif" }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSS for waveform animation */}
      <style>{`
        @keyframes wave-bar {
          from { height: 4px; }
          to { height: 32px; }
        }
      `}</style>
    </section>
  );
}
