import { useRef, useState, useCallback, useEffect } from "react";
import { Mic, MicOff, Volume2, Zap, CheckCircle, Send, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────
type SessionState = "idle" | "connecting" | "listening" | "speaking" | "error";
type TranscriptLine = { role: "user" | "agent"; text: string };
type TaskState = "none" | "creating" | "created" | "error";

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

// ─── Task Result Panel ────────────────────────────────────────────────────────
function TaskResultPanel({ taskId }: { taskId: string }) {
  const [expanded, setExpanded] = useState(true);

  const { data: statusData } = trpc.manusTask.getStatus.useQuery(
    { taskId },
    { refetchInterval: (query) => {
        const s = query.state.data?.status;
        return s === "completed" || s === "failed" ? false : 4000;
      }
    }
  );

  const { data: messagesData } = trpc.manusTask.getMessages.useQuery(
    { taskId },
    { refetchInterval: (query) => {
        const s = statusData?.status;
        return s === "completed" || s === "failed" ? false : 5000;
      }
    }
  );

  const status = statusData?.status ?? "running";
  const messages = messagesData?.messages ?? [];
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");

  const statusColor = status === "completed" ? "#22c55e" : status === "failed" ? "#ef4444" : "#B600A8";
  const statusLabel = {
    running: "Í gangi...",
    completed: "Lokið",
    failed: "Villa",
    pending: "Bíður...",
  }[status] ?? status;

  return (
    <div
      className="rounded-2xl overflow-hidden mt-6"
      style={{ border: "1px solid rgba(182,0,168,0.3)", background: "rgba(12,12,12,0.95)" }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: expanded ? "1px solid rgba(215,226,234,0.06)" : "none", background: "rgba(182,0,168,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}`, animation: status === "running" || status === "pending" ? "pulse 1.5s ease-in-out infinite" : "none" }}
          />
          <span className="text-sm font-medium uppercase tracking-widest" style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>
            Gummi er að vinna
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(182,0,168,0.15)", color: statusColor, fontFamily: "'Kanit',sans-serif" }}>
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: "rgba(182,0,168,0.5)" }}>{taskId.slice(0, 12)}…</span>
          {expanded ? <ChevronUp size={14} style={{ color: "rgba(215,226,234,0.4)" }} /> : <ChevronDown size={14} style={{ color: "rgba(215,226,234,0.4)" }} />}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-5 py-4">
          {lastAssistantMsg ? (
            <div>
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "rgba(215,226,234,0.35)", fontFamily: "'Kanit',sans-serif" }}>
                Síðasta skilaboð frá Gumma
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>
                {lastAssistantMsg.content}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3" style={{ color: "rgba(215,226,234,0.4)" }}>
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm" style={{ fontFamily: "'Kanit',sans-serif" }}>Gummi er að ræsa verkefnið...</span>
            </div>
          )}
          {messages.length > 1 && (
            <p className="text-xs mt-3" style={{ color: "rgba(215,226,234,0.25)", fontFamily: "'Kanit',sans-serif" }}>
              {messages.length} skilaboð í heildina
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────
export default function VoiceAgentSection() {
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [taskState, setTaskState] = useState<TaskState>("none");
  const [taskId, setTaskId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // tRPC mutation for creating Manus tasks
  const createTask = trpc.manusTask.create.useMutation({
    onSuccess: (data) => {
      if (data.taskId) {
        setTaskId(data.taskId);
        setTaskState("created");
      }
    },
    onError: () => setTaskState("error"),
  });

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, currentText]);

  // Play PCM audio chunks from xAI
  const playNextChunk = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    const ctx = audioContextRef.current;
    if (!ctx) return;
    // Resume AudioContext if suspended — required on iOS/Android after user gesture
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch { /* ignore */ }
    }
    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;
    // xAI sends 24kHz 16-bit mono PCM — resample if device rate differs (iOS ignores sampleRate hint)
    const pcm = new Int16Array(chunk);
    const float32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) float32[i] = pcm[i] / 32768;
    const srcRate = 24000;
    const dstRate = ctx.sampleRate;
    let finalFloat32 = float32;
    if (dstRate !== srcRate) {
      const ratio = srcRate / dstRate;
      const outLen = Math.round(float32.length / ratio);
      finalFloat32 = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) {
        const srcIdx = i * ratio;
        const lo = Math.floor(srcIdx);
        const hi = Math.min(lo + 1, float32.length - 1);
        finalFloat32[i] = float32[lo] + (float32[hi] - float32[lo]) * (srcIdx - lo);
      }
    }
    const buffer = ctx.createBuffer(1, finalFloat32.length, dstRate);
    buffer.copyToChannel(finalFloat32, 0);
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
    // Stop audio capture (ScriptProcessor or MediaRecorder)
    mediaRecorderRef.current?.stop();
    wsRef.current?.close();
    wsRef.current = null;
    mediaRecorderRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setSessionState("idle");
    setCurrentText("");
  }, []);

  const startSession = useCallback(async () => {
    if (sessionState !== "idle") { stopSession(); return; }
    setSessionState("connecting");
    setTranscript([]);
    setCurrentText("");
    setTaskState("none");
    setTaskId(null);

    try {
      // ── Step 1: Get mic permission FIRST while still in user gesture context ──
      // getUserMedia MUST be called synchronously in the click handler on Android Chrome.
      // Calling it inside ws.onopen (async, after network roundtrip) loses the gesture context.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      // ── Step 2: Set up AudioContext (already created in onClick for Android) ──
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      try { await ctx.resume(); } catch { /* ignore */ }
      audioQueueRef.current = [];
      isPlayingRef.current = false;

      // ── Step 3: Wire up PCM capture pipeline ──
      const source = ctx.createMediaStreamSource(stream);
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      const deviceRate = ctx.sampleRate;
      const targetRate = 24000;
      // We'll start sending audio once the WebSocket is open
      let wsReady = false;
      processor.onaudioprocess = (e) => {
        if (!wsReady || wsRef.current?.readyState !== WebSocket.OPEN) return;
        const float32 = e.inputBuffer.getChannelData(0);
        let samples = float32;
        if (deviceRate !== targetRate) {
          const ratio = deviceRate / targetRate;
          const outLen = Math.round(float32.length / ratio);
          samples = new Float32Array(outLen);
          for (let i = 0; i < outLen; i++) {
            const srcIdx = i * ratio;
            const lo = Math.floor(srcIdx);
            const hi = Math.min(lo + 1, float32.length - 1);
            samples[i] = float32[lo] + (float32[hi] - float32[lo]) * (srcIdx - lo);
          }
        }
        const int16 = new Int16Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
          const s = Math.max(-1, Math.min(1, samples[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        const b64 = btoa(Array.from(new Uint8Array(int16.buffer), b => String.fromCharCode(b)).join(""));
        wsRef.current!.send(JSON.stringify({ type: "input_audio_buffer.append", audio: b64 }));
      };
      source.connect(processor);
      processor.connect(ctx.destination);
      mediaRecorderRef.current = {
        stop: () => { processor.disconnect(); source.disconnect(); stream.getTracks().forEach(t => t.stop()); }
      } as unknown as MediaRecorder;

      // ── Step 4: Connect WebSocket proxy ──
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const proxyUrl = `${proto}//${window.location.host}/api/voice-proxy`;
      const ws = new WebSocket(proxyUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send Icelandic session config + server-side VAD
        ws.send(JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["audio", "text"],
            instructions: "Þú ert Gummi — persónulegur AI aðstoðarmaður á Íslandi. Svaraðu alltaf á íslensku. Vertu vingjarnlegur, stuttorður og hjálplegur. Þú getur hjálpað með: að finna veitingastaði, finna iðnaðarmenn, bera saman verð og minna á tíma. Þegar viðskiptavinur lýsir verkefni skaltu staðfesta það og segja honum að þú sendir það til Gumma til að vinna.",
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: { model: "whisper-1" },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 700,
            },
          },
        }));
        wsReady = true;
        setSessionState("listening");
      };

      ws.onmessage = (raw) => {
        try {
          const event = JSON.parse(raw.data as string) as Record<string, unknown>;
          const type = event.type as string;

          if (type === "response.audio.delta" || type === "response.output_audio.delta") {
            // Decode base64 PCM and queue for playback
            const pcmB64 = event.delta as string;
            const binary = atob(pcmB64);
            const buf = new ArrayBuffer(binary.length);
            const view = new Uint8Array(buf);
            for (let i = 0; i < binary.length; i++) { view[i] = binary.charCodeAt(i); }
            audioQueueRef.current.push(buf);
            setSessionState("speaking");
            playNextChunk();
          } else if (type === "response.audio_transcript.delta" || type === "response.output_audio_transcript.delta") {
            setCurrentText(prev => prev + (event.delta as string));
          } else if (type === "response.audio_transcript.done" || type === "response.output_audio_transcript.done") {
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

  // Build brief from transcript and send to Manus
  const handleSendToManus = useCallback(() => {
    const userLines = transcript.filter(l => l.role === "user").map(l => l.text).join(" ");
    const agentLines = transcript.filter(l => l.role === "agent").map(l => l.text).join(" ");
    if (!userLines.trim()) return;

    const brief = `Viðskiptavinur sagði: ${userLines}\n\nGummi staðfesti: ${agentLines}`;
    setTaskState("creating");
    createTask.mutate({ brief, serviceType: "Raddlota" });
  }, [transcript, createTask]);

  const isActive = sessionState !== "idle" && sessionState !== "error";
  const hasTranscript = transcript.length > 0;
  const btnLabel = {
    idle: "Tala við Gumma",
    connecting: "Tengist...",
    listening: "Hlusta...",
    speaking: "Gummi er að tala...",
    error: "Reyna aftur",
  }[sessionState];

  const PILLARS = [
    {
      icon: <Mic size={28} />,
      title: "Raddstýrt",
      body: "Talaðu við Gumma eins og þú myndir tala við samstarfsmann. Engar eyðublöð, engar lýsingar, engin tölvupóstsamskipti. Talaðu bara.",
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
            Persónulegur raddaðstoðarmaður — í gangi núna
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
          className="rounded-3xl overflow-hidden mb-6"
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
                  ? "Smelltu á hljóðnemann til að hefja lotu með Gumma"
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
                  {line.role === "agent" ? "G" : "Þ"}
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
              onClick={() => {
                // Android Chrome requires AudioContext created synchronously in click handler
                if (sessionState === "idle") {
                  try {
                    const ctx = new AudioContext();
                    ctx.resume().catch(() => {});
                    audioContextRef.current = ctx;
                  } catch { /* ignore */ }
                }
                startSession();
              }}
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
                {sessionState === "speaking" ? "Talar" : "Hljóð"}
              </span>
            </div>
          </div>
        </div>

        {/* Send to Manus button — shown after voice session has transcript */}
        {hasTranscript && sessionState === "idle" && taskState === "none" && (
          <div className="flex justify-center mb-6">
            <button
              onClick={handleSendToManus}
              className="flex items-center gap-3 px-8 py-3.5 rounded-full font-medium uppercase tracking-widest text-sm"
              style={{
                background: "linear-gradient(123deg,#18011F 7%,#B600A8 37%,#7621B0 72%,#BE4C00 100%)",
                border: "2px solid transparent",
                color: "#fff",
                fontFamily: "'Kanit',sans-serif",
                boxShadow: "0 0 24px rgba(182,0,168,0.3)",
                cursor: "pointer",
                transition: "all 0.2s ease-out",
              }}
              onMouseDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
              onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              <Send size={18} />
              Senda verkefni til Gumma
            </button>
          </div>
        )}

        {/* Creating task indicator */}
        {taskState === "creating" && (
          <div className="flex justify-center items-center gap-3 mb-6" style={{ color: "rgba(215,226,234,0.5)" }}>
            <Loader2 size={18} className="animate-spin" style={{ color: "#B600A8" }} />
            <span className="text-sm uppercase tracking-widest" style={{ fontFamily: "'Kanit',sans-serif" }}>
              Sendir verkefni til Gumma...
            </span>
          </div>
        )}

        {/* Task error */}
        {taskState === "error" && (
          <div className="flex justify-center mb-6">
            <p className="text-sm" style={{ color: "#ef4444", fontFamily: "'Kanit',sans-serif" }}>
              Villa við að senda verkefni. Reyndu aftur.
            </p>
          </div>
        )}

        {/* Task result panel */}
        {taskState === "created" && taskId && (
          <div className="mb-16 sm:mb-20">
            <TaskResultPanel taskId={taskId} />
          </div>
        )}

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
