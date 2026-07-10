import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import IVLayout from "@/components/IVLayout";
import {
  Send, Bot, CheckCircle2, AlertCircle, Clock, Loader2,
  Zap, RefreshCw, ChevronDown, ChevronUp, Inbox, Globe, Code2, BarChart3, Cpu
} from "lucide-react";

type AgentType = "manus" | "browser" | "swe" | "data_analysis";

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
  projectRef: string | null;
};

const AGENTS: { id: AgentType; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { id: "manus", label: "Manus", desc: "General-purpose agent — web, files, code", icon: <Cpu size={14} />, color: "var(--iv-blue)" },
  { id: "browser", label: "Browser", desc: "Playwright browser automation", icon: <Globe size={14} />, color: "#a78bfa" },
  { id: "swe", label: "SWE", desc: "Software engineering tasks", icon: <Code2 size={14} />, color: "#34d399" },
  { id: "data_analysis", label: "Data", desc: "Data analysis & visualisation", icon: <BarChart3 size={14} />, color: "#fb923c" },
];

const STATUS_ICON: Record<string, React.ReactNode> = {
  queued: <Clock size={13} className="shrink-0" style={{ color: "#f59e0b" }} />,
  thinking: <Loader2 size={13} className="shrink-0 animate-spin" style={{ color: "var(--iv-blue)" }} />,
  done: <CheckCircle2 size={13} className="shrink-0" style={{ color: "#00FF87" }} />,
  error: <AlertCircle size={13} className="shrink-0" style={{ color: "#ef4444" }} />,
};

const STATUS_COLOR: Record<string, string> = {
  queued: "#f59e0b",
  thinking: "var(--iv-blue)",
  done: "#00FF87",
  error: "#ef4444",
};

function TaskCard({ task, onSync }: { task: Task; onSync?: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const elapsed = task.elapsedMs ? `${(task.elapsedMs / 1000).toFixed(1)}s` : null;
  const isActive = task.status === "queued" || task.status === "thinking";
  return (
    <div
      className="rounded-xl p-4 cursor-pointer transition-all duration-150 hover:brightness-110"
      style={{ backgroundColor: "var(--iv-surface)", border: `1px solid ${isActive ? "rgba(0,180,216,0.3)" : "var(--iv-border)"}` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{STATUS_ICON[task.status] ?? STATUS_ICON.queued}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold" style={{ color: STATUS_COLOR[task.status] ?? "#f59e0b" }}>
              {task.status.toUpperCase()}
            </span>
            {elapsed && <span className="text-xs font-mono" style={{ color: "var(--iv-text-muted)" }}>{elapsed}</span>}
            <span className="text-xs font-mono ml-auto" style={{ color: "var(--iv-text-muted)" }}>#{task.id}</span>
            {isActive && onSync && (
              <button
                onClick={e => { e.stopPropagation(); onSync(task.id); }}
                className="p-0.5 rounded hover:bg-white/10 transition-colors"
                title="Sync status from OpenManus"
              >
                <RefreshCw size={11} style={{ color: "var(--iv-blue)" }} />
              </button>
            )}
          </div>
          <p className="text-sm truncate" style={{ color: "var(--iv-text)" }}>{task.prompt}</p>
          <div className="text-xs font-mono mt-0.5" style={{ color: "var(--iv-text-muted)" }}>
            {task.workerId}
          </div>
          {expanded && (
            <div className="mt-3 space-y-2">
              {task.reply && (
                <div className="p-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap" style={{
                  backgroundColor: task.status === "error" ? "rgba(239,68,68,0.08)" : "var(--iv-surface-2)",
                  color: task.status === "error" ? "#ef4444" : "var(--iv-text)",
                  borderLeft: `2px solid ${STATUS_COLOR[task.status] ?? "#f59e0b"}`,
                }}>
                  {task.reply}
                </div>
              )}
              {task.projectRef && (
                <div className="text-xs font-mono" style={{ color: "var(--iv-text-muted)" }}>
                  OpenManus ID: {task.projectRef}
                </div>
              )}
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

export default function OpenManusWorker() {
  const [prompt, setPrompt] = useState("");
  const [agentType, setAgentType] = useState<AgentType>("manus");
  const [activePollIds, setActivePollIds] = useState<Set<number>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utils = trpc.useUtils();

  const { data: tasks = [], refetch: refetchTasks } = trpc.worker.tasks.useQuery(
    { limit: 50 },
    { refetchInterval: activePollIds.size > 0 ? 3000 : false }
  );

  const dispatchMutation = trpc.worker.dispatch.useMutation({
    onSuccess: (task) => {
      setPrompt("");
      setElapsed(0);
      clearInterval(timerRef.current!);
      // Start polling for this task
      setActivePollIds(prev => new Set(Array.from(prev).concat(task.id)));
      utils.worker.tasks.invalidate();
    },
    onError: () => {
      clearInterval(timerRef.current!);
      setElapsed(0);
    },
  });

  const syncMutation = trpc.worker.syncTask.useMutation({
    onSuccess: (updated) => {
      utils.worker.tasks.invalidate();
      if (updated && (updated.status === "done" || updated.status === "error")) {
        setActivePollIds(prev => {
          const next = new Set(prev);
          next.delete(updated.id);
          return next;
        });
      }
    },
  });

  // Auto-sync active tasks every 4 seconds
  useEffect(() => {
    if (activePollIds.size === 0) return;
    const interval = setInterval(() => {
      activePollIds.forEach(id => syncMutation.mutate({ id }));
    }, 4000);
    return () => clearInterval(interval);
  }, [activePollIds]);

  // Also pick up any pre-existing active tasks from DB on mount
  useEffect(() => {
    const active = (tasks as Task[]).filter(t => t.status === "queued" || t.status === "thinking");
    if (active.length > 0) {
      setActivePollIds(prev => new Set(Array.from(prev).concat(active.map(t => t.id))));
    }
  }, [tasks.length]);

  const handleDispatch = () => {
    const text = prompt.trim();
    if (!text || dispatchMutation.isPending) return;
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    dispatchMutation.mutate({ prompt: text, agentType });
  };

  const handleSync = useCallback((id: number) => {
    syncMutation.mutate({ id });
  }, []);

  const isDispatching = dispatchMutation.isPending;
  const activeTasks = (tasks as Task[]).filter(t => t.status === "queued" || t.status === "thinking");
  const doneTasks = (tasks as Task[]).filter(t => t.status === "done" || t.status === "error");

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
              OpenManus Worker
            </div>
            <div className="text-xs font-mono" style={{ color: "var(--iv-blue)" }}>
              GPT-4o · Playwright · Bash · Web Search
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {activePollIds.size > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono" style={{ backgroundColor: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.25)", color: "var(--iv-blue)" }}>
                <Loader2 size={11} className="animate-spin" />
                {activePollIds.size} RUNNING
              </div>
            )}
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
          {/* Left: Dispatch panel */}
          <div className="flex flex-col w-[420px] shrink-0 border-r" style={{ borderColor: "var(--iv-border)" }}>
            {/* Agent selector */}
            <div className="shrink-0 p-4 space-y-2" style={{ borderBottom: "1px solid var(--iv-border)" }}>
              <div className="text-xs font-mono font-semibold mb-3" style={{ color: "var(--iv-text-muted)" }}>SELECT AGENT</div>
              <div className="grid grid-cols-2 gap-2">
                {AGENTS.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => setAgentType(agent.id)}
                    className="flex items-start gap-2 p-3 rounded-xl text-left transition-all duration-150"
                    style={{
                      backgroundColor: agentType === agent.id ? `rgba(0,180,216,0.12)` : "var(--iv-surface)",
                      border: `1px solid ${agentType === agent.id ? "rgba(0,180,216,0.4)" : "var(--iv-border)"}`,
                      color: agentType === agent.id ? agent.color : "var(--iv-text-muted)",
                    }}
                  >
                    <span style={{ color: agent.color, marginTop: 1 }}>{agent.icon}</span>
                    <div>
                      <div className="text-xs font-semibold" style={{ fontFamily: "'Syne', sans-serif" }}>{agent.label}</div>
                      <div className="text-xs mt-0.5 leading-tight opacity-70">{agent.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt input */}
            <div className="flex-1 p-4 flex flex-col gap-3">
              <div className="text-xs font-mono font-semibold" style={{ color: "var(--iv-text-muted)" }}>TASK PROMPT</div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleDispatch(); }}
                placeholder={`Describe what you want the ${AGENTS.find(a => a.id === agentType)?.label} agent to do...\n\n⌘+Enter to dispatch`}
                rows={8}
                className="flex-1 w-full px-4 py-3 text-sm resize-none rounded-xl outline-none"
                style={{
                  backgroundColor: "var(--iv-surface)",
                  border: "1px solid var(--iv-border)",
                  color: "var(--iv-text)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
                disabled={isDispatching}
              />
              <button
                onClick={handleDispatch}
                disabled={!prompt.trim() || isDispatching}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] disabled:opacity-40"
                style={{ backgroundColor: "var(--iv-blue)", color: "var(--iv-navy)", fontFamily: "'Syne', sans-serif" }}
              >
                {isDispatching ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Dispatching... {elapsed}s
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    Dispatch to OpenManus
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Task history */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Active tasks */}
            {activeTasks.length > 0 && (
              <div className="shrink-0 p-4" style={{ borderBottom: "1px solid var(--iv-border)" }}>
                <div className="text-xs font-mono font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--iv-blue)" }}>
                  <Loader2 size={11} className="animate-spin" />
                  ACTIVE ({activeTasks.length})
                </div>
                <div className="space-y-2">
                  {activeTasks.map(task => (
                    <TaskCard key={task.id} task={task as Task} onSync={handleSync} />
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            <div className="shrink-0 px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--iv-border)" }}>
              <Inbox size={14} style={{ color: "var(--iv-text-muted)" }} />
              <span className="text-xs font-mono font-semibold" style={{ color: "var(--iv-text-muted)" }}>HISTORY</span>
              <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(0,180,216,0.1)", color: "var(--iv-blue)" }}>
                {doneTasks.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {doneTasks.length === 0 && activeTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.2)" }}>
                    <Zap size={28} style={{ color: "var(--iv-blue)" }} />
                  </div>
                  <div>
                    <div className="text-base font-semibold mb-1" style={{ color: "var(--iv-text)", fontFamily: "'Syne', sans-serif" }}>
                      No tasks yet
                    </div>
                    <div className="text-sm" style={{ color: "var(--iv-text-muted)" }}>
                      Select an agent and describe a task.<br />
                      OpenManus will execute it autonomously.
                    </div>
                  </div>
                </div>
              )}
              {doneTasks.map(task => (
                <TaskCard key={task.id} task={task as Task} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </IVLayout>
  );
}
