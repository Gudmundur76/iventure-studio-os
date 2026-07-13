import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import {
  Bot,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Brain,
  Zap,
  MemoryStick,
} from "lucide-react";
import { History, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────
interface SubtaskRow {
  id: number;
  workerId: string;
  prompt: string;
  status: "queued" | "thinking" | "done" | "error";
  reply: string | null;
  subtaskIndex: number | null;
  elapsedMs: number | null;
}

interface ParentRow {
  id: number;
  status: "queued" | "thinking" | "done" | "error";
  reply: string | null;
  prompt: string;
}

interface HistoryRow {
  id: number;
  prompt: string;
  status: string;
  reply: string | null;
  createdAt: Date;
  elapsedMs: number | null;
  subtaskCount: number;
}

// ── Status helpers ─────────────────────────────────────────────────────────
function statusIcon(status: string) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case "thinking":
      return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    case "error":
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    default:
      return <Clock className="w-4 h-4 text-zinc-500" />;
  }
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    done: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    thinking: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    error: "bg-red-500/15 text-red-300 border-red-500/30",
    queued: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[status] ?? map.queued}`}>
      {status}
    </span>
  );
}

// ── SubtaskCard ────────────────────────────────────────────────────────────
function SubtaskCard({ task, index }: { task: SubtaskRow; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 text-xs flex items-center justify-center font-mono">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {statusIcon(task.status)}
            <span className="text-xs font-mono text-violet-400">{task.workerId}</span>
            {statusBadge(task.status)}
            {task.elapsedMs != null && (
              <span className="text-xs text-zinc-500">{(task.elapsedMs / 1000).toFixed(1)}s</span>
            )}
          </div>
          <p className="text-sm text-zinc-300 mt-1 line-clamp-2">{task.prompt}</p>
        </div>
        {task.reply && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>
      {expanded && task.reply && (
        <div className="ml-7 rounded bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-300 whitespace-pre-wrap">
          {task.reply}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function MetaAgent() {
  const [prompt, setPrompt] = useState("");
  const [parentTaskId, setParentTaskId] = useState<number | null>(null);
  const [metaRef, setMetaRef] = useState<string | null>(null);
  const [planSummary, setPlanSummary] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);

  const historyQuery = trpc.metaAgent.history.useQuery({ limit: 20 });

  const dispatchMut = trpc.metaAgent.dispatch.useMutation({
    onSuccess: (data) => {
      setParentTaskId(data.parentTaskId);
      setMetaRef(data.metaRef);
      setPlanSummary(data.plan.summary);
      setPolling(true);
      toast.success("Mr. Agent dispatched — working on it…");
      historyQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Dispatch failed: ${err.message}`);
    },
  });

  const statusQuery = trpc.metaAgent.status.useQuery(
    { parentTaskId: parentTaskId! },
    {
      enabled: parentTaskId != null && polling,
      refetchInterval: polling ? 2000 : false,
    }
  );

  const parent = statusQuery.data?.parent as ParentRow | null | undefined;
  const subtasks = (statusQuery.data?.subtasks ?? []) as SubtaskRow[];

  // Stop polling when parent is done or error
  useEffect(() => {
    if (parent?.status === "done" || parent?.status === "error") {
      setPolling(false);
    }
  }, [parent?.status]);

  const handleDispatch = () => {
    if (!prompt.trim()) return;
    setParentTaskId(null);
    setMetaRef(null);
    setPlanSummary(null);
    setPolling(false);
    setSelectedHistoryId(null);
    dispatchMut.mutate({ prompt: prompt.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleDispatch();
    }
  };

  const isRunning = dispatchMut.isPending || polling;
  const isDone = parent?.status === "done";
  const isError = parent?.status === "error";

  const doneCount = subtasks.filter((s) => s.status === "done").length;
  const totalCount = subtasks.length;

  const handleLoadSession = (row: HistoryRow) => {
    setSelectedHistoryId(row.id);
    setParentTaskId(row.id);
    setMetaRef(null);
    setPlanSummary(null);
    setPolling(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <Bot className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Mr. Agent</h1>
          <p className="text-sm text-zinc-500">Meta-agent orchestration — decompose, dispatch, synthesise</p>
        </div>
      </div>

      {/* Stat pills */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
          <Brain className="w-3.5 h-3.5 text-violet-400" />
          Memory-aware
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Parallel dispatch
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
          <MemoryStick className="w-3.5 h-3.5 text-emerald-400" />
          Auto-memory write
        </div>
      </div>

      {/* Input card */}
      <Card className="bg-zinc-900/80 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300">New Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you need Mr. Agent to do… (⌘+Enter to dispatch)"
            className="min-h-[100px] bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none focus:border-violet-500/50 focus:ring-violet-500/20"
            disabled={isRunning}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600">{prompt.length}/4096</span>
            <Button
              onClick={handleDispatch}
              disabled={!prompt.trim() || isRunning}
              className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
            >
              {dispatchMut.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {dispatchMut.isPending ? "Planning…" : "Dispatch"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dispatch plan + subtask status */}
      {parentTaskId != null && (
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-400" />
                Dispatch Plan
                {metaRef && (
                  <span className="text-xs font-mono text-zinc-600">{metaRef}</span>
                )}
              </CardTitle>
              {totalCount > 0 && (
                <span className="text-xs text-zinc-500">
                  {doneCount}/{totalCount} subtasks
                </span>
              )}
            </div>
            {planSummary && (
              <p className="text-sm text-zinc-400 mt-1">{planSummary}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {statusQuery.isLoading && subtasks.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500 py-4 justify-center">
                <Spinner className="w-4 h-4" />
                Waiting for subtasks…
              </div>
            ) : (
              subtasks.map((task, i) => (
                <SubtaskCard key={task.id} task={task} index={i} />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Synthesised result */}
      {isDone && parent?.reply && (
        <Card className="bg-zinc-900/80 border-emerald-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Mr. Agent Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[400px]">
              <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {parent.reply}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {isError && parent?.reply && (
        <Card className="bg-zinc-900/80 border-red-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Execution Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-300">{parent.reply}</p>
          </CardContent>
        </Card>
      )}

      {/* Past Sessions */}
      <Card className="bg-zinc-900/80 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-500" />
              Past Sessions
            </CardTitle>
            <button
              onClick={() => historyQuery.refetch()}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${historyQuery.isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-600 py-4 justify-center">
              <Spinner className="w-4 h-4" />
              Loading history…
            </div>
          ) : !historyQuery.data || historyQuery.data.length === 0 ? (
            <div className="py-6 text-center">
              <History className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
              <p className="text-sm text-zinc-600">No sessions yet. Dispatch your first task above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(historyQuery.data as HistoryRow[]).map((row) => (
                <button
                  key={row.id}
                  onClick={() => handleLoadSession(row)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedHistoryId === row.id
                      ? "border-violet-500/40 bg-violet-500/10"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300 line-clamp-1">{row.prompt}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {statusBadge(row.status)}
                        <span className="text-xs text-zinc-600">
                          {row.subtaskCount} subtask{row.subtaskCount !== 1 ? "s" : ""}
                        </span>
                        {row.elapsedMs != null && (
                          <span className="text-xs text-zinc-600">
                            {(row.elapsedMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-zinc-600 flex-shrink-0 mt-0.5">
                      {new Date(row.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
