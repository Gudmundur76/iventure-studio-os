import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Phone, PhoneOff, Volume2, Loader2, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────
type SessionState = "idle" | "connecting" | "connected" | "error";

interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
  ts: number;
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function VoiceAgent() {
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const addTranscript = useCallback((role: "user" | "assistant", text: string) => {
    setTranscript(prev => [...prev, { role, text, ts: Date.now() }]);
  }, []);

  // ── Connect to xAI Voice API via WebRTC ───────────────────────────────────
  const connect = useCallback(async () => {
    setSessionState("connecting");
    setTranscript([]);

    try {
      // 1. Get ephemeral token from our server
      const tokenRes = await fetch("/api/xai-voice-token");
      if (!tokenRes.ok) {
        const err = await tokenRes.json() as { error?: string };
        throw new Error(err.error ?? "Failed to get voice token");
      }
      const { token } = await tokenRes.json() as { token: string; sessionId: string };

      if (!token) {
        // xAI Voice API may not support ephemeral tokens yet — show setup instructions
        setSessionState("error");
        toast.error("xAI Voice API: ephemeral token not available. Configure via xAI console.");
        return;
      }

      // 2. Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Create WebRTC peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 4. Add audio output element
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audioRef.current = audio;
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0];
      };

      // 5. Add microphone track
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 6. Create data channel for events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        setSessionState("connected");
        addTranscript("assistant", "Connected to iVenture OS Voice Agent. How can I help you?");
      };

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data as string) as Record<string, unknown>;
          const type = event.type as string;

          if (type === "conversation.item.input_audio_transcription.completed") {
            const text = (event.transcript as string) ?? "";
            if (text.trim()) addTranscript("user", text);
          }

          if (type === "response.audio_transcript.done") {
            const text = (event.transcript as string) ?? "";
            if (text.trim()) addTranscript("assistant", text);
          }
        } catch {
          // ignore parse errors
        }
      };

      dc.onclose = () => {
        if (sessionState !== "idle") setSessionState("idle");
      };

      // 7. Create SDP offer and connect to xAI
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch("https://api.x.ai/v1/realtime?model=grok-voice-latest", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!sdpRes.ok) {
        throw new Error(`xAI SDP error: ${sdpRes.status} ${await sdpRes.text()}`);
      }

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

    } catch (err) {
      console.error("[VoiceAgent] connect error:", err);
      setSessionState("error");
      toast.error(err instanceof Error ? err.message : "Failed to connect");
      disconnect();
    }
  }, [addTranscript, sessionState]);

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (audioRef.current) audioRef.current.srcObject = null;
    pcRef.current = null;
    dcRef.current = null;
    streamRef.current = null;
    setSessionState("idle");
    setIsMuted(false);
  }, []);

  // ── Toggle mute ────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach(t => {
      t.enabled = isMuted;
    });
    setIsMuted(m => !m);
  }, [isMuted]);

  // ── Copy embed code ────────────────────────────────────────────────────────
  const embedCode = `<script src="https://os.gummi.lt/voice-widget.js" data-token-url="https://os.gummi.lt/api/xai-voice-token"></script>`;
  const mcpUrl = `https://os.gummi.lt/api/mcp`;
  const mcpToken = `[set MCP_BEARER_TOKEN env var]`;

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const stateColors: Record<SessionState, string> = {
    idle: "bg-zinc-500",
    connecting: "bg-yellow-500 animate-pulse",
    connected: "bg-green-500",
    error: "bg-red-500",
  };

  const stateLabels: Record<SessionState, string> = {
    idle: "Idle",
    connecting: "Connecting...",
    connected: "Live",
    error: "Error",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voice Agent</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Speak directly to the iVenture OS — dispatch tasks, check agents, review healing proposals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${stateColors[sessionState]}`} />
          <span className="text-sm font-medium">{stateLabels[sessionState]}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice Call Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Voice Call
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Big call button */}
            <div className="flex flex-col items-center gap-4 py-6">
              <div className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                sessionState === "connected"
                  ? "bg-green-500/20 ring-4 ring-green-500/30"
                  : sessionState === "connecting"
                  ? "bg-yellow-500/20 ring-4 ring-yellow-500/30"
                  : "bg-primary/10"
              }`}>
                {sessionState === "connecting" ? (
                  <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
                ) : sessionState === "connected" ? (
                  <Volume2 className="w-10 h-10 text-green-500" />
                ) : (
                  <Mic className="w-10 h-10 text-primary" />
                )}
              </div>

              <div className="flex gap-3">
                {sessionState === "idle" || sessionState === "error" ? (
                  <Button onClick={connect} size="lg" className="gap-2">
                    <Phone className="w-4 h-4" />
                    Start Call
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={toggleMute}
                      variant="outline"
                      size="lg"
                      className="gap-2"
                      disabled={sessionState === "connecting"}
                    >
                      {isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4" />}
                      {isMuted ? "Unmute" : "Mute"}
                    </Button>
                    <Button
                      onClick={disconnect}
                      variant="destructive"
                      size="lg"
                      className="gap-2"
                    >
                      <PhoneOff className="w-4 h-4" />
                      End Call
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* What you can say */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Try saying</p>
              {[
                "What agents are running?",
                "Dispatch a research task to NanoClaw",
                "What healing proposals are pending?",
                "Run an awareness scan",
                "List all tenants",
              ].map(s => (
                <p key={s} className="text-sm text-muted-foreground">• {s}</p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 overflow-y-auto space-y-3 pr-1">
              {transcript.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center pt-8">
                  Start a call to see the conversation here.
                </p>
              ) : (
                transcript.map((entry, i) => (
                  <div key={i} className={`flex gap-2 ${entry.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      entry.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}>
                      {entry.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MCP Server Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            MCP Server — Connect External Agents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect the iVenture OS to any MCP-compatible AI agent — xAI Voice Agent Builder, Claude, or any custom agent. Add this MCP server URL in your agent's configuration.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* MCP URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">MCP Server URL</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono truncate">{mcpUrl}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => copyText(mcpUrl, "mcp-url")}
                >
                  {copied === "mcp-url" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            {/* Auth */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Auth (Bearer Token)</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono truncate">{mcpToken}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => copyText(mcpToken, "mcp-token")}
                >
                  {copied === "mcp-token" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Available tools */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Tools</p>
            <div className="flex flex-wrap gap-2">
              {["get_agent_status", "dispatch_task", "get_healing_proposals", "run_awareness_scan", "get_code_graph_summary", "get_tenant_list"].map(tool => (
                <Badge key={tool} variant="secondary" className="font-mono text-xs">{tool}</Badge>
              ))}
            </div>
          </div>

          {/* xAI Console link */}
          <div className="rounded-lg border border-dashed p-4 space-y-2">
            <p className="text-sm font-medium">Set up in xAI Voice Agent Builder</p>
            <p className="text-xs text-muted-foreground">
              Go to <strong>console.x.ai</strong> → Voice Agent Builder → Add Custom MCP → paste the URL above and your Bearer token. Your phone number will be provisioned automatically.
            </p>
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href="https://console.x.ai" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
                Open xAI Console
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Embed code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Embed on Client Websites
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Add this script tag to any client website to embed a voice widget that connects back to the iVenture OS.
          </p>
          <div className="flex items-start gap-2">
            <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono break-all">{embedCode}</code>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 mt-0.5"
              onClick={() => copyText(embedCode, "embed")}
            >
              {copied === "embed" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
