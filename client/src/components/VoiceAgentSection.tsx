import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type SessionState = "idle" | "connecting" | "listening" | "speaking" | "error";
type TranscriptLine = { role: "user" | "agent"; text: string };

// ─── Icelandic system prompt ──────────────────────────────────────────────────
const SYSTEM_PROMPT =
  "Þú ert Gummi — persónulegur AI aðstoðarmaður á Íslandi. " +
  "Svaraðu alltaf á íslensku. Vertu vingjarnlegur, stuttorður og hjálplegur. " +
  "Þú getur hjálpað með: að finna veitingastaði, finna iðnaðarmenn, bera saman verð og minna á tíma. " +
  "Þegar viðskiptavinur lýsir verkefni skaltu staðfesta það og segja honum að þú sendir það til Gumma til að vinna.";

// ─── PCM helpers ─────────────────────────────────────────────────────────────
function resample(input: Float32Array<ArrayBuffer>, fromRate: number, toRate: number): Float32Array<ArrayBuffer> {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLen = Math.round(input.length / ratio);
  const out = new Float32Array(outLen) as Float32Array<ArrayBuffer>;
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const lo = Math.floor(src);
    const hi = Math.min(lo + 1, input.length - 1);
    out[i] = input[lo] + (input[hi] - input[lo]) * (src - lo);
  }
  return out;
}

function float32ToPcm16B64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function pcm16B64ToFloat32(b64: string): Float32Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
  return float32;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function VoiceAgentSection() {
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const currentTextRef = useRef("");

  useEffect(() => { currentTextRef.current = currentText; }, [currentText]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, currentText]);

  // ── Playback ────────────────────────────────────────────────────────────────
  const playNextChunk = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === "closed") return;
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch { /* ignore */ }
    }
    isPlayingRef.current = true;
    const samples = audioQueueRef.current.shift()!;
    const resampled = resample(samples as Float32Array<ArrayBuffer>, 24000, ctx.sampleRate);
    const buffer = ctx.createBuffer(1, resampled.length, ctx.sampleRate);
    buffer.copyToChannel(resampled, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      playNextChunk();
    };
    source.start();
  }, []);

  // ── Stop ────────────────────────────────────────────────────────────────────
  const stopSession = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setSessionState("idle");
    setCurrentText("");
    setErrorMessage("");
  }, []);

  // ── Start ───────────────────────────────────────────────────────────────────
  const startSession = useCallback(async (stream: MediaStream) => {
    setSessionState("connecting");
    setTranscript([]);
    setCurrentText("");
    streamRef.current = stream;

    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      try { await ctx.resume(); } catch { /* ignore */ }

      let wsReady = false;
      const source = ctx.createMediaStreamSource(stream);
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!wsReady || wsRef.current?.readyState !== WebSocket.OPEN) return;
        const raw = e.inputBuffer.getChannelData(0);
        const resampled = resample(raw as Float32Array<ArrayBuffer>, ctx.sampleRate, 24000);
        const b64 = float32ToPcm16B64(resampled);
        wsRef.current!.send(JSON.stringify({ type: "input_audio_buffer.append", audio: b64 }));
      };
      source.connect(processor);
      processor.connect(ctx.destination);

      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      // Use port 8443 — dedicated Traefik entrypoint without HTTP/2 for WebSocket support
      const wsHost = window.location.hostname + ':8443';
      const ws = new WebSocket(`${proto}//${wsHost}/api/voice-proxy`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: "session.update",
          session: {
            type: "realtime",
            modalities: ["audio", "text"],
            instructions: SYSTEM_PROMPT,
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: { model: "whisper-1" },
            turn_detection: { type: "server_vad", threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 700 },
          },
        }));
        wsReady = true;
        setSessionState("listening");
      };

      ws.onmessage = (raw) => {
        try {
          const event = JSON.parse(raw.data as string) as Record<string, unknown>;
          const type = event.type as string;

          if (type === "response.output_audio.delta") {
            const samples = pcm16B64ToFloat32(event.delta as string);
            audioQueueRef.current.push(samples);
            setSessionState("speaking");
            playNextChunk();
          } else if (type === "response.output_audio_transcript.delta") {
            setCurrentText(prev => prev + (event.delta as string));
          } else if (type === "response.output_audio_transcript.done") {
            const text = (event.transcript as string) || currentTextRef.current;
            if (text.trim()) setTranscript(prev => [...prev, { role: "agent", text: text.trim() }]);
            setCurrentText("");
            setSessionState("listening");
          } else if (type === "conversation.item.input_audio_transcription.completed") {
            const text = event.transcript as string;
            if (text?.trim()) setTranscript(prev => [...prev, { role: "user", text: text.trim() }]);
          } else if (type === "error") {
            const err = event.error as Record<string, unknown>;
            setErrorMessage((err?.message as string) || "Villa í tengingu");
            setSessionState("error");
          }
        } catch { /* ignore */ }
      };

      ws.onerror = () => { setErrorMessage("Tenging misheppnaðist"); setSessionState("error"); };
      ws.onclose = (e) => {
        if (e.code !== 1000 && e.code !== 1001) {
          setErrorMessage("Tenging lokað — reyna aftur");
          setSessionState("error");
        }
      };

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/permission|denied|notallowed/i.test(msg)) {
        setErrorMessage("Leyfðu hljóðnemanum — smelltu á lásinn í veffangastikunni");
      } else if (/notfound|devicenotfound/i.test(msg)) {
        setErrorMessage("Enginn hljóðnemi fannst");
      } else {
        setErrorMessage("Villa: " + msg);
      }
      setSessionState("error");
      stream.getTracks().forEach(t => t.stop());
    }
  }, [playNextChunk]);

  const isActive = sessionState !== "idle" && sessionState !== "error";

  const handleMicClick = useCallback(() => {
    if (isActive) { stopSession(); return; }
    if (sessionState === "error") { setSessionState("idle"); setErrorMessage(""); return; }

    navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    }).then(stream => {
      startSession(stream);
    }).catch(err => {
      const msg = err instanceof Error ? err.message : String(err);
      if (/permission|denied|notallowed/i.test(msg)) {
        setErrorMessage("Leyfðu hljóðnemanum — smelltu á lásinn í veffangastikunni");
      } else {
        setErrorMessage("Hljóðnemi ekki aðgengilegur");
      }
      setSessionState("error");
    });
  }, [isActive, sessionState, stopSession, startSession]);

  return (
    <section
      id="tala"
      className="relative py-20 sm:py-28 px-5 sm:px-8 overflow-hidden"
      style={{ background: "linear-gradient(180deg,#0A0A0A 0%,#0D0118 50%,#0A0A0A 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(182,0,168,0.08) 0%, transparent 70%)" }} />

      <div className="relative max-w-3xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-10">
          <p className="uppercase tracking-widest text-xs mb-3 font-medium" style={{ color: "#B600A8", fontFamily: "'Kanit',sans-serif" }}>
            RADDARÐSTOÐARMAÐUR
          </p>
          <h2 className="font-black uppercase mb-3" style={{ color: "#D7E2EA", fontSize: "clamp(2rem,5vw,3.5rem)", fontFamily: "'Kanit',sans-serif", lineHeight: 1.1 }}>
            TALA VIÐ GUMMA
          </h2>
          <p className="font-light" style={{ color: "rgba(215,226,234,0.5)", fontFamily: "'Kanit',sans-serif", fontSize: "clamp(0.9rem,1.5vw,1.05rem)" }}>
            Persónulegur raddaðstoðarmaður — í gangi núna
          </p>
        </div>

        {/* Widget */}
        <div className="rounded-3xl overflow-hidden" style={{ border: "1px solid rgba(182,0,168,0.25)", background: "rgba(10,10,10,0.95)" }}>

          {/* Status bar */}
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(215,226,234,0.06)", background: "rgba(215,226,234,0.02)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{
                background: sessionState === "error" ? "#ef4444" : isActive ? "#22c55e" : "rgba(215,226,234,0.2)",
                boxShadow: isActive ? "0 0 8px #22c55e" : sessionState === "error" ? "0 0 8px #ef4444" : "none",
                animation: sessionState === "listening" ? "pulse 1.5s ease-in-out infinite" : "none",
              }} />
              <span className="font-medium uppercase tracking-widest text-xs" style={{ color: "rgba(215,226,234,0.45)", fontFamily: "'Kanit',sans-serif" }}>
                {sessionState === "idle" ? "TILBÚINN" : sessionState === "connecting" ? "TENGIST..." : sessionState === "listening" ? "HLUSTA..." : sessionState === "speaking" ? "TALAR..." : "VILLA"}
              </span>
            </div>
            <span className="text-xs font-mono" style={{ color: "rgba(182,0,168,0.5)" }}>gummi-v2</span>
          </div>

          {/* Transcript */}
          <div className="px-5 py-5 overflow-y-auto flex flex-col gap-3" style={{ minHeight: "200px", maxHeight: "340px" }}>
            {transcript.length === 0 && !currentText && (
              <div className="flex-1 flex items-center justify-center text-center py-8" style={{ color: sessionState === "error" ? "#ef4444" : "rgba(215,226,234,0.18)", fontFamily: "'Kanit',sans-serif", fontSize: "0.9rem" }}>
                {sessionState === "error" && errorMessage ? errorMessage : "Smelltu á hljóðnemann til að hefja samtal"}
              </div>
            )}

            {transcript.map((line, i) => (
              <div key={i} className={`flex gap-2.5 ${line.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold" style={{ background: line.role === "agent" ? "linear-gradient(135deg,#7621B0,#B600A8)" : "rgba(215,226,234,0.1)", color: "#fff", fontFamily: "'Kanit',sans-serif" }}>
                  {line.role === "agent" ? "G" : "Þ"}
                </div>
                <div className="max-w-[82%] px-4 py-2.5 text-sm leading-relaxed" style={{ background: line.role === "agent" ? "rgba(182,0,168,0.09)" : "rgba(215,226,234,0.05)", border: `1px solid ${line.role === "agent" ? "rgba(182,0,168,0.22)" : "rgba(215,226,234,0.08)"}`, borderRadius: line.role === "agent" ? "4px 16px 16px 16px" : "16px 4px 16px 16px", color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>
                  {line.text}
                </div>
              </div>
            ))}

            {currentText && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold" style={{ background: "linear-gradient(135deg,#7621B0,#B600A8)", color: "#fff", fontFamily: "'Kanit',sans-serif" }}>G</div>
                <div className="max-w-[82%] px-4 py-2.5 text-sm leading-relaxed" style={{ background: "rgba(182,0,168,0.09)", border: "1px solid rgba(182,0,168,0.22)", borderRadius: "4px 16px 16px 16px", color: "#D7E2EA", fontFamily: "'Kanit',sans-serif" }}>
                  {currentText}
                  <span className="inline-block w-0.5 h-4 ml-1 align-middle animate-pulse" style={{ background: "#B600A8" }} />
                </div>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Controls */}
          <div className="px-5 py-5 flex flex-col items-center gap-3" style={{ borderTop: "1px solid rgba(215,226,234,0.06)" }}>
            <button
              onClick={handleMicClick}
              disabled={sessionState === "connecting"}
              className="flex items-center gap-3 px-8 py-3.5 rounded-full font-medium uppercase tracking-widest text-sm transition-all active:scale-95"
              style={{
                background: isActive ? "rgba(182,0,168,0.15)" : sessionState === "error" ? "rgba(239,68,68,0.15)" : "linear-gradient(123deg,#18011F 7%,#B600A8 37%,#7621B0 72%,#BE4C00 100%)",
                border: isActive ? "2px solid rgba(182,0,168,0.5)" : sessionState === "error" ? "2px solid rgba(239,68,68,0.4)" : "2px solid transparent",
                color: "#fff",
                fontFamily: "'Kanit',sans-serif",
                opacity: sessionState === "connecting" ? 0.6 : 1,
                cursor: sessionState === "connecting" ? "not-allowed" : "pointer",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isActive ? (
                  <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
                ) : (
                  <>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </>
                )}
              </svg>
              {sessionState === "connecting" ? "TENGIST..." :
               sessionState === "listening" ? "HLUSTA — STÖÐVA" :
               sessionState === "speaking" ? "TALAR — STÖÐVA" :
               sessionState === "error" ? "REYNA AFTUR" :
               "TALA VIÐ GUMMA"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
