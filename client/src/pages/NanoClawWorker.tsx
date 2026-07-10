import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import IVLayout from "@/components/IVLayout";
import {
  Send, Bot, CheckCircle2, AlertCircle, Clock, Loader2,
  Zap, Activity, RefreshCw, ChevronDown, ChevronUp, Inbox
} from "lucide-react";

type Task = {
  id: number;
  workerId: string;
  prompt: string;
  language: string;
  status: "queued" | "thinking" | "done" | "error";
  reply: string | null;
  elapsedMs: number | null;
  createdAt: Date;
  completedAt: Date | null;
};

const STATUS_ICON = {
  queued: <Clock size={13} className="shrink-0" style={{ color: "#f59e0b" }} />,
  thinking: <Loader2 size={13} className="shrink-0 animate-spin" style={{ color: "var(--iv-blue)" }} />,
  done: <CheckCircle2 size={13} className="shrink-0" style={{ color: "#00FF87" }} />,
  error: <AlertCircle size={13} className="shrink-0" style={{ color: "#ef4444" }} />,
};

const STATUS_LABEL = {
  queued: "QUEUED",
  thinking: "THINKING...",
  done: "DONE",
  error: "ERROR",
};

function TaskCard({ task }: { task: Task }) {
  const [expanded, setExpanded] = useState(false);
  const elapsed = task.elapsedMs ? `${(task.elapsedMs / 1000).toFixed(1)}s` : null;
  return (
    <div
      className="rounded-xl p-4 cursor-pointer transition-all duration-150 hover:brightness-110"
      style={{
        backgroundColor: "var(--iv-surface)",
        border: "1px solid var(--iv-border)",
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{STATUS_ICON[task.status]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold" style={{
              color: task.status === "done" ? "#00FF87" : task.status === "error" ? "#ef4444" : task.status === "thinking" ? "var(--iv-blue)" : "#f59e0b"
            }}>
              {STATUS_LABEL[task.status]}
            </span>
            {elapsed && (
              <span className="text-xs font-mono" style={{ color: "var(--iv-text-muted)" }}>
                {elapsed}
              </span>
            )}
            <span className="ml-auto text-xs font-mono" style={{ color: "var(--iv-text-muted)" }}>
              #{task.id}
            </span>
          </div>
          <p className="text-sm truncate" style={{ color: "var(--iv-text)" }}>
            {task.prompt}
          </p>
          {expanded && task.reply && (
            <div className="mt-3 p-3 rounded-lg text-sm leading-relaxed" style={{
              backgroundColor: "var(--iv-surface-2)",
              color: "var(--iv-text)",
              borderLeft: "2px solid var(--iv-blue)",
            }}>
              {task.reply}
            </div>
          )}
          {expanded && task.status === "error" && task.reply && (
            <div className="mt-3 p-3 rounded-lg text-sm" style={{
              backgroundColor: "rgba(239,68,68,0.08)",
              color: "#ef4444",
              borderLeft: "2px solid #ef4444",
            }}>
              {task.reply}
            </div>
          )}
        </div>
        <div className="shrink-0 mt-0.5" style={{ color: "var(--iv-text-muted)" }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>
    </div>
  );
}

export default function NanoClawWorker() {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("is");
  const [pendingTask, setPendingTask] = useState<Task | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utils = trpc.useUtils();

  const { data: tasks = [], refetch: refetchTasks } = trpc.worker.tasks.useQuery({ limit: 50 });
  const sendMutation = trpc.worker.dispatch.useMutation();

  // Poll for pending task completion
  const { data: polledTask } = trpc.worker.task.useQuery(
    { id: pendingTask?.id ?? 0 },
    {
      enabled: !!pendingTask && pendingTask.status === "thinking",
      refetchInterval: 2000,
    }
  );

  useEffect(() => {
    if (polledTask && polledTask.status !== "thinking") {
      setPendingTask(polledTask as Task);
      clearInterval(timerRef.current!);
      refetchTasks();
      utils.worker.tasks.invalidate();
    }
  }, [polledTask]);

  const handleSend = async () => {
    const text = prompt.trim();
    if (!text || sendMutation.isPending) return;
    setPrompt("");
    setElapsed(0);

    // Start elapsed timer
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    try {
      const task = await sendMutation.mutateAsync({ prompt: text, agentType: "manus" });
      setPendingTask(task as Task);
      clearInterval(timerRef.current!);
      refetchTasks();
      utils.worker.tasks.invalidate();
    } catch (err) {
      clearInterval(timerRef.current!);
      setPendingTask({
        id: 0,
        workerId: "nanoclaw",
        prompt: text,
        language,
        status: "error",
        reply: err instanceof Error ? err.message : "Unknown error",
        elapsedMs: elapsed * 1000,
        createdAt: new Date(),
        completedAt: new Date(),
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const isThinking = sendMutation.isPending || (pendingTask?.status === "thinking");

  return (
    <IVLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 flex items-center gap-4" style={{ borderBottom: "1px solid var(--iv-border)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(0,180,216,0.15)", border: "1px solid rgba(0,180,216,0.3)" }}>
            <Bot size={18} style={{ color: "var(--iv-blue)" }} />
          </div>
          <div>
            <div className="text-base font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--iv-text)" }}>
              NanoClaw Worker
            </div>
            <div className="text-xs font-mono" style={{ color: "var(--iv-blue)" }}>
              gummi.lt · Grok 3 + MRAgent Memory · Icelandic
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono" style={{ backgroundColor: "rgba(0,255,135,0.1)", border: "1px solid rgba(0,255,135,0.25)", color: "#00FF87" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              ONLINE
            </div>
            <button
              onClick={() => { refetchTasks(); utils.worker.tasks.invalidate(); }}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: "var(--iv-text-muted)" }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Task input + current reply */}
          <div className="flex flex-col w-1/2 border-r" style={{ borderColor: "var(--iv-border)" }}>
            {/* Current task result */}
            <div className="flex-1 overflow-y-auto p-6">
              {!pendingTask && !isThinking && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.2)" }}>
                    <Zap size={28} style={{ color: "var(--iv-blue)" }} />
                  </div>
                  <div>
                    <div className="text-base font-semibold mb-1" style={{ color: "var(--iv-text)", fontFamily: "'Syne', sans-serif" }}>
                      Send a task to NanoClaw
                    </div>
                    <div className="text-sm" style={{ color: "var(--iv-text-muted)" }}>
                      NanoClaw has full memory of iVenture Studio.<br />
                      Ask it anything — in Icelandic or English.
                    </div>
                  </div>
                </div>
              )}

              {isThinking && (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.3)" }}>
                    <Loader2 size={28} className="animate-spin" style={{ color: "var(--iv-blue)" }} />
                  </div>
                  <div className="text-center">
                    <div className="text-base font-semibold mb-1" style={{ color: "var(--iv-text)", fontFamily: "'Syne', sans-serif" }}>
                      NanoClaw is thinking...
                    </div>
                    <div className="text-2xl font-mono font-bold" style={{ color: "var(--iv-blue)" }}>
                      {elapsed}s
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--iv-text-muted)" }}>
                      Querying Grok 3 + MRAgent memory
                    </div>
                  </div>
                </div>
              )}

              {pendingTask && !isThinking && (
                <div className="space-y-4">
                  {/* Prompt */}
                  <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--iv-surface)", border: "1px solid var(--iv-border)" }}>
                    <div className="text-xs font-mono mb-2" style={{ color: "var(--iv-text-muted)" }}>YOU ASKED</div>
                    <p className="text-sm" style={{ color: "var(--iv-text)" }}>{pendingTask.prompt}</p>
                  </div>

                  {/* Reply */}
                  {pendingTask.status === "done" && pendingTask.reply && (
                    <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--iv-surface)", border: "1px solid rgba(0,255,135,0.2)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-xs font-mono" style={{ color: "#00FF87" }}>NANOCLAW REPLIED</div>
                        {pendingTask.elapsedMs && (
                          <span className="text-xs font-mono ml-auto" style={{ color: "var(--iv-text-muted)" }}>
                            {(pendingTask.elapsedMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--iv-text)" }}>{pendingTask.reply}</p>
                    </div>
                  )}

                  {pendingTask.status === "error" && (
                    <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                      <div className="text-xs font-mono mb-2" style={{ color: "#ef4444" }}>ERROR</div>
                      <p className="text-sm" style={{ color: "#ef4444" }}>{pendingTask.reply}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="shrink-0 p-4" style={{ borderTop: "1px solid var(--iv-border)" }}>
              <div className="flex items-end gap-2">
                <div className="flex-1 rounded-xl overflow-hidden" style={{ backgroundColor: "var(--iv-surface)", border: "1px solid var(--iv-border)" }}>
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Send a task to NanoClaw... (⌘+Enter to send)"
                    rows={3}
                    className="w-full px-4 py-3 text-sm resize-none bg-transparent outline-none"
                    style={{ color: "var(--iv-text)", fontFamily: "'DM Sans', sans-serif" }}
                    disabled={isThinking}
                  />
                  <div className="flex items-center gap-2 px-3 pb-2">
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="text-xs px-2 py-1 rounded bg-transparent border outline-none cursor-pointer"
                      style={{ borderColor: "var(--iv-border)", color: "var(--iv-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      <option value="is">🇮🇸 Icelandic</option>
                      <option value="en">🇬🇧 English</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!prompt.trim() || isThinking}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150 active:scale-95 disabled:opacity-40"
                  style={{ backgroundColor: "var(--iv-blue)", color: "var(--iv-navy)" }}
                >
                  {isThinking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Task history */}
          <div className="flex flex-col w-1/2">
            <div className="shrink-0 px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--iv-border)" }}>
              <Inbox size={14} style={{ color: "var(--iv-text-muted)" }} />
              <span className="text-xs font-mono font-semibold" style={{ color: "var(--iv-text-muted)" }}>TASK HISTORY</span>
              <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(0,180,216,0.1)", color: "var(--iv-blue)" }}>
                {tasks.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {tasks.length === 0 && (
                <div className="flex items-center justify-center h-32 text-sm" style={{ color: "var(--iv-text-muted)" }}>
                  No tasks yet
                </div>
              )}
              {(tasks as Task[]).map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </IVLayout>
  );
}
