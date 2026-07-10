import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import {
  Plus, Bot, CheckCircle2, AlertCircle, Clock, Loader2,
  ChevronDown, ChevronUp, Trash2, RefreshCw, ListTodo, Zap, RotateCcw
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

const STATUS_COLORS = {
  queued: "#f59e0b",
  thinking: "var(--iv-blue)",
  done: "#00FF87",
  error: "#ef4444",
};

const STATUS_ICON = {
  queued: <Clock size={12} className="shrink-0" />,
  thinking: <Loader2 size={12} className="shrink-0 animate-spin" />,
  done: <CheckCircle2 size={12} className="shrink-0" />,
  error: <AlertCircle size={12} className="shrink-0" />,
};

function TaskRow({ task }: { task: Task }) {
  const [expanded, setExpanded] = useState(false);
  const elapsed = task.elapsedMs ? `${(task.elapsedMs / 1000).toFixed(1)}s` : null;
  const color = STATUS_COLORS[task.status];
  return (
    <div style={{ borderBottom: "1px solid var(--iv-border)" }}>
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mt-0.5 shrink-0" style={{ color }}>
          {STATUS_ICON[task.status]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate" style={{ color: "var(--iv-text)" }}>{task.prompt}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs font-mono font-bold" style={{ color }}>
              {task.status.toUpperCase()}
            </span>
            {elapsed && <span className="text-xs font-mono" style={{ color: "var(--iv-text-muted)" }}>{elapsed}</span>}
            <span className="text-xs font-mono" style={{ color: "var(--iv-text-muted)" }}>
              {new Date(task.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-xs font-mono" style={{ color: "var(--iv-text-muted)" }}>
          #{task.id}
        </div>
        <div className="shrink-0" style={{ color: "var(--iv-text-muted)" }}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </div>
      {expanded && task.reply && (
        <div className="px-4 pb-3 ml-6">
          <div className="p-3 rounded-lg text-sm leading-relaxed" style={{
            backgroundColor: task.status === "error" ? "rgba(239,68,68,0.08)" : "var(--iv-surface-2)",
            color: task.status === "error" ? "#ef4444" : "var(--iv-text)",
            borderLeft: `2px solid ${color}`,
          }}>
            {task.reply}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TaskQueue() {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("is");
  const [filter, setFilter] = useState<"all" | "done" | "error" | "thinking">("all");
  const [overrideAgentId, setOverrideAgentId] = useState<string | undefined>();
  const [showRouting, setShowRouting] = useState(false);
  const utils = trpc.useUtils();

  const { data: tasks = [], refetch } = trpc.worker.tasks.useQuery({ limit: 100 });
  const { data: agents = [] } = trpc.agents.list.useQuery();
  const { data: routingRec, isFetching: routingLoading } = trpc.routing.recommend.useQuery(
    { prompt },
    { enabled: showRouting && prompt.trim().length > 10 }
  );
  const dispatchMutation = trpc.routing.dispatch.useMutation({
    onSuccess: () => {
      setPrompt("");
      setOverrideAgentId(undefined);
      setShowRouting(false);
      utils.worker.tasks.invalidate();
    },
  });
  const sendMutation = trpc.worker.send.useMutation({
    onSuccess: () => {
      setPrompt("");
      utils.worker.tasks.invalidate();
    },
  });

  const filtered = (tasks as Task[]).filter(t => filter === "all" || t.status === filter);

  const counts = {
    all: tasks.length,
    done: (tasks as Task[]).filter(t => t.status === "done").length,
    thinking: (tasks as Task[]).filter(t => t.status === "thinking").length,
    error: (tasks as Task[]).filter(t => t.status === "error").length,
  };

  const handleSend = () => {
    const text = prompt.trim();
    if (!text || sendMutation.isPending || dispatchMutation.isPending) return;
    if (showRouting) {
      dispatchMutation.mutate({ prompt: text, language, overrideAgentId });
    } else {
      sendMutation.mutate({ prompt: text, language });
    }
  };

  return (
    <div className="flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 flex items-center gap-4" style={{ borderBottom: "1px solid var(--iv-border)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(0,255,135,0.1)", border: "1px solid rgba(0,255,135,0.2)" }}>
            <ListTodo size={18} style={{ color: "#00FF87" }} />
          </div>
          <div>
            <div className="text-base font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--iv-text)" }}>Task Queue</div>
            <div className="text-xs font-mono" style={{ color: "var(--iv-text-muted)" }}>All tasks dispatched to NanoClaw</div>
          </div>
          <button
            onClick={() => { refetch(); utils.worker.tasks.invalidate(); }}
            className="ml-auto p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "var(--iv-text-muted)" }}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Quick dispatch */}
        <div className="shrink-0 px-6 py-4" style={{ borderBottom: "1px solid var(--iv-border)", backgroundColor: "var(--iv-surface)" }}>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: "var(--iv-surface-2)", border: "1px solid var(--iv-border)" }}>
              <Bot size={14} style={{ color: "var(--iv-blue)" }} />
              <input
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Describe the task — smart routing will select best agent..."
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "var(--iv-text)", fontFamily: "'DM Sans', sans-serif" }}
                disabled={sendMutation.isPending || dispatchMutation.isPending}
              />
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="text-xs bg-transparent outline-none cursor-pointer border-0"
                style={{ color: "var(--iv-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
              >
                <option value="is">🇮🇸</option>
                <option value="en">🇬🇧</option>
              </select>
              <button
                onClick={() => setShowRouting(!showRouting)}
                className="p-1 rounded-lg transition-colors"
                title="Toggle smart routing"
                style={{ color: showRouting ? "var(--iv-blue)" : "var(--iv-text-muted)", backgroundColor: showRouting ? "rgba(0,180,216,0.1)" : "transparent" }}
              >
                <Zap size={13} />
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={!prompt.trim() || sendMutation.isPending || dispatchMutation.isPending}
              className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: "var(--iv-blue)", color: "var(--iv-navy)", fontFamily: "'Syne', sans-serif" }}
            >
              {(sendMutation.isPending || dispatchMutation.isPending) ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Dispatch
            </button>
          </div>
          {/* Smart routing recommendation panel */}
          {showRouting && prompt.trim().length > 10 && (
            <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: "var(--iv-surface-2)", border: "1px solid var(--iv-border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Zap size={12} style={{ color: "var(--iv-blue)" }} />
                <span className="text-xs font-mono font-bold" style={{ color: "var(--iv-blue)" }}>SMART ROUTING</span>
                {routingLoading && <Loader2 size={11} className="animate-spin ml-auto" style={{ color: "var(--iv-text-muted)" }} />}
              </div>
              {routingRec && (
                <>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs" style={{ color: "var(--iv-text-muted)" }}>Recommended:</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(0,255,135,0.1)", color: "#00FF87", border: "1px solid rgba(0,255,135,0.2)" }}>
                      {overrideAgentId ? (agents as any[]).find((a: any) => a.agentId === overrideAgentId)?.name ?? overrideAgentId : routingRec.selectedAgentName}
                    </span>
                    <span className="text-xs font-mono" style={{ color: "var(--iv-text-muted)" }}>
                      score {routingRec.score.toFixed(1)} · [{(routingRec.taskCategories as string[]).join(", ")}]
                    </span>
                    {overrideAgentId && (
                      <button onClick={() => setOverrideAgentId(undefined)} className="ml-auto flex items-center gap-1 text-xs" style={{ color: "var(--iv-text-muted)" }}>
                        <RotateCcw size={10} /> Reset
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(routingRec.candidates as any[]).map((c: any) => (
                      <button
                        key={c.agentId}
                        onClick={() => setOverrideAgentId(c.agentId === routingRec.selectedAgentId && !overrideAgentId ? undefined : c.agentId)}
                        className="text-xs px-2 py-0.5 rounded-md transition-colors"
                        style={{
                          backgroundColor: (overrideAgentId ?? routingRec.selectedAgentId) === c.agentId ? "rgba(0,180,216,0.15)" : "rgba(255,255,255,0.04)",
                          color: (overrideAgentId ?? routingRec.selectedAgentId) === c.agentId ? "var(--iv-blue)" : "var(--iv-text-muted)",
                          border: `1px solid ${(overrideAgentId ?? routingRec.selectedAgentId) === c.agentId ? "rgba(0,180,216,0.3)" : "var(--iv-border)"}`,
                        }}
                      >
                        {c.name} <span className="opacity-60">{c.score.toFixed(0)}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="shrink-0 px-6 flex items-center gap-1 py-2" style={{ borderBottom: "1px solid var(--iv-border)" }}>
          {(["all", "done", "thinking", "error"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors"
              style={{
                backgroundColor: filter === f ? "rgba(0,180,216,0.15)" : "transparent",
                color: filter === f ? "var(--iv-blue)" : "var(--iv-text-muted)",
                border: filter === f ? "1px solid rgba(0,180,216,0.3)" : "1px solid transparent",
              }}
            >
              {f.toUpperCase()} ({counts[f]})
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm" style={{ color: "var(--iv-text-muted)" }}>
              {filter === "all" ? "No tasks yet — dispatch one above" : `No ${filter} tasks`}
            </div>
          )}
          {filtered.map(task => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>

        {/* Stats footer */}
        {tasks.length > 0 && (
          <div className="shrink-0 px-6 py-3 flex items-center gap-6" style={{ borderTop: "1px solid var(--iv-border)" }}>
            <div className="text-xs font-mono" style={{ color: "var(--iv-text-muted)" }}>
              <span style={{ color: "#00FF87" }}>{counts.done}</span> done ·{" "}
              <span style={{ color: "var(--iv-blue)" }}>{counts.thinking}</span> thinking ·{" "}
              <span style={{ color: "#ef4444" }}>{counts.error}</span> errors
            </div>
            {counts.done > 0 && (
              <div className="text-xs font-mono ml-auto" style={{ color: "var(--iv-text-muted)" }}>
                avg {Math.round(
                  (tasks as Task[])
                    .filter(t => t.status === "done" && t.elapsedMs)
                    .reduce((s, t) => s + (t.elapsedMs ?? 0), 0) /
                  Math.max(1, (tasks as Task[]).filter(t => t.status === "done" && t.elapsedMs).length) / 1000
                )}s per task
              </div>
            )}
          </div>
        )}
      </div>
  );
}
