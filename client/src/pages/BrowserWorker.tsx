import { useState, useEffect } from "react";
import IVLayout from "@/components/IVLayout";
import { trpc } from "@/lib/trpc";
import { Globe, Play, RefreshCw, Clock, CheckCircle, XCircle, Loader2, ExternalLink, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  queued: "#F59E0B",
  running: "#00B4D8",
  done: "#10B981",
  error: "#EF4444",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  queued: <Clock size={12} />,
  running: <Loader2 size={12} className="animate-spin" />,
  done: <CheckCircle size={12} />,
  error: <XCircle size={12} />,
};

export default function BrowserWorker() {
  const [prompt, setPrompt] = useState("");
  const [startUrl, setStartUrl] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pollingId, setPollingId] = useState<number | null>(null);

  const { data: tasks = [], refetch } = trpc.browser.list.useQuery(
    { limit: 20 },
    { refetchInterval: 5000 }
  );

  const { data: selectedTask, refetch: refetchSelected } = trpc.browser.get.useQuery(
    { id: selectedId! },
    { enabled: selectedId !== null, refetchInterval: pollingId !== null ? 3000 : false }
  );

  const dispatchMut = trpc.browser.dispatch.useMutation({
    onSuccess: (task) => {
      toast.success(`Browser task #${task.id} dispatched`);
      setSelectedId(task.id);
      setPollingId(task.id);
      setPrompt("");
      setStartUrl("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const syncMut = trpc.browser.sync.useMutation({
    onSuccess: (task) => {
      refetch();
      refetchSelected();
      if (task.status === "done" || task.status === "error") {
        setPollingId(null);
      }
    },
  });

  // Auto-poll running tasks
  useEffect(() => {
    if (!pollingId) return;
    const interval = setInterval(() => {
      syncMut.mutate({ id: pollingId });
    }, 3000);
    return () => clearInterval(interval);
  }, [pollingId]);

  // Stop polling when task is done
  useEffect(() => {
    if (selectedTask && (selectedTask.status === "done" || selectedTask.status === "error")) {
      setPollingId(null);
    }
  }, [selectedTask?.status]);

  const displayTask = selectedId !== null ? selectedTask : null;

  return (
    <IVLayout>
      <div className="flex flex-col h-full" style={{ backgroundColor: "var(--iv-navy)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--iv-border)" }}>
          <div className="flex items-center gap-3">
            <Globe size={20} style={{ color: "var(--iv-blue)" }} />
            <h1 className="text-lg font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--iv-text)" }}>
              Browser Worker
            </h1>
            <Badge style={{ backgroundColor: "rgba(0,180,216,0.15)", color: "var(--iv-blue)", border: "1px solid rgba(0,180,216,0.3)" }}>
              browser-use · VPS:8767
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            style={{ borderColor: "var(--iv-border)", color: "var(--iv-text)" }}
          >
            <RefreshCw size={14} />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: dispatch + task list */}
          <div className="w-80 shrink-0 flex flex-col" style={{ borderRight: "1px solid var(--iv-border)" }}>
            {/* Dispatch form */}
            <div className="p-4" style={{ borderBottom: "1px solid var(--iv-border)" }}>
              <div className="text-xs font-semibold mb-3" style={{ color: "var(--iv-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                NEW BROWSER TASK
              </div>
              <Input
                value={startUrl}
                onChange={e => setStartUrl(e.target.value)}
                placeholder="Start URL (optional)"
                className="mb-2 text-sm h-8"
                style={{ backgroundColor: "var(--iv-navy)", borderColor: "var(--iv-border)", color: "var(--iv-text)" }}
              />
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe what the browser should do..."
                rows={4}
                className="mb-2 text-sm"
                style={{ backgroundColor: "var(--iv-navy)", borderColor: "var(--iv-border)", color: "var(--iv-text)" }}
              />
              <Button
                size="sm"
                className="w-full"
                onClick={() => dispatchMut.mutate({ prompt, startUrl: startUrl || undefined })}
                disabled={dispatchMut.isPending || !prompt.trim()}
                style={{ backgroundColor: "var(--iv-blue)", color: "#0A2342" }}
              >
                <Play size={14} className="mr-1" />
                {dispatchMut.isPending ? "Dispatching..." : "Run Task"}
              </Button>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto">
              <div className="text-xs font-semibold px-4 py-2" style={{ color: "var(--iv-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                RECENT TASKS ({tasks.length})
              </div>
              {tasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => setSelectedId(task.id)}
                  className="w-full text-left px-4 py-3 border-b transition-all hover:bg-white/5"
                  style={{
                    borderColor: "var(--iv-border)",
                    backgroundColor: selectedId === task.id ? "rgba(0,180,216,0.08)" : "transparent",
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-mono" style={{ color: "var(--iv-muted)" }}>#{task.id}</span>
                    <div className="flex items-center gap-1" style={{ color: STATUS_COLORS[task.status] }}>
                      {STATUS_ICONS[task.status]}
                      <span className="text-xs font-mono">{task.status}</span>
                    </div>
                  </div>
                  <div className="text-xs truncate" style={{ color: "var(--iv-text)" }}>
                    {task.prompt.slice(0, 80)}{task.prompt.length > 80 ? "…" : ""}
                  </div>
                  {task.elapsedMs && (
                    <div className="text-xs mt-0.5" style={{ color: "var(--iv-muted)" }}>
                      {(task.elapsedMs / 1000).toFixed(1)}s
                    </div>
                  )}
                </button>
              ))}
              {tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 gap-2" style={{ color: "var(--iv-muted)" }}>
                  <Globe size={24} />
                  <div className="text-xs">No tasks yet</div>
                </div>
              )}
            </div>
          </div>

          {/* Right: task detail */}
          <div className="flex-1 overflow-y-auto p-6">
            {!displayTask ? (
              <div className="flex flex-col items-center justify-center h-full gap-4" style={{ color: "var(--iv-muted)" }}>
                <Globe size={48} />
                <div className="text-center">
                  <div className="text-base font-semibold mb-1" style={{ color: "var(--iv-text)" }}>Browser Automation Worker</div>
                  <div className="text-sm max-w-sm">
                    Dispatch tasks to the browser-use worker running on VPS. The agent will control a real browser to complete web tasks.
                  </div>
                  <div className="mt-4 p-3 rounded-lg text-xs text-left" style={{ backgroundColor: "var(--iv-surface)", border: "1px solid var(--iv-border)", fontFamily: "'JetBrains Mono', monospace" }}>
                    <div style={{ color: "var(--iv-blue)" }}>Worker: http://187.124.213.194:8767</div>
                    <div style={{ color: "var(--iv-muted)" }}>Engine: browser-use + Playwright</div>
                    <div style={{ color: "var(--iv-muted)" }}>LLM: GPT-4o-mini</div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono" style={{ color: "var(--iv-muted)" }}>Task #{displayTask.id}</span>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-mono" style={{ backgroundColor: `${STATUS_COLORS[displayTask.status]}20`, color: STATUS_COLORS[displayTask.status] }}>
                      {STATUS_ICONS[displayTask.status]}
                      <span>{displayTask.status}</span>
                    </div>
                    {displayTask.elapsedMs && (
                      <span className="text-xs" style={{ color: "var(--iv-muted)" }}>{(displayTask.elapsedMs / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                  {displayTask.startUrl && (
                    <a href={displayTask.startUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs" style={{ color: "var(--iv-blue)" }}>
                      <ExternalLink size={12} /> {displayTask.startUrl.slice(0, 40)}
                    </a>
                  )}
                </div>

                <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: "var(--iv-surface)", border: "1px solid var(--iv-border)" }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: "var(--iv-muted)", fontFamily: "'JetBrains Mono', monospace" }}>PROMPT</div>
                  <div className="text-sm" style={{ color: "var(--iv-text)" }}>{displayTask.prompt}</div>
                </div>

                {displayTask.status === "running" && (
                  <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ backgroundColor: "rgba(0,180,216,0.08)", border: "1px solid rgba(0,180,216,0.3)" }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: "var(--iv-blue)" }} />
                    <span className="text-sm" style={{ color: "var(--iv-blue)" }}>Browser agent is working... auto-polling every 3s</span>
                  </div>
                )}

                {displayTask.result && (
                  <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: "var(--iv-surface)", border: "1px solid var(--iv-border)" }}>
                    <div className="text-xs font-semibold mb-2" style={{ color: "#10B981", fontFamily: "'JetBrains Mono', monospace" }}>RESULT</div>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--iv-text)" }}>{displayTask.result}</div>
                  </div>
                )}

                {displayTask.errorMessage && (
                  <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <div className="text-xs font-semibold mb-2" style={{ color: "#EF4444", fontFamily: "'JetBrains Mono', monospace" }}>ERROR</div>
                    <div className="text-sm font-mono" style={{ color: "#EF4444" }}>{displayTask.errorMessage}</div>
                  </div>
                )}

                {displayTask.steps && displayTask.steps.length > 0 && (
                  <div className="rounded-lg p-4" style={{ backgroundColor: "var(--iv-surface)", border: "1px solid var(--iv-border)" }}>
                    <div className="text-xs font-semibold mb-2" style={{ color: "var(--iv-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                      STEPS ({displayTask.steps.length})
                    </div>
                    <div className="space-y-1">
                      {displayTask.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "var(--iv-muted)" }}>
                          <Terminal size={10} />
                          <span>{step.action}</span>
                          {step.url && <span className="truncate" style={{ color: "var(--iv-blue)" }}>{step.url}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </IVLayout>
  );
}
