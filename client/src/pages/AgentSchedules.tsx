import { useState } from "react";
import IVLayout from "@/components/IVLayout";
import { trpc } from "@/lib/trpc";
import { CalendarClock, Plus, Play, Pause, Trash2, Edit2, CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const CRON_PRESETS = [
  { label: "Every hour", value: "0 0 * * * *" },
  { label: "Every 6h", value: "0 0 */6 * * *" },
  { label: "Daily 9am", value: "0 0 9 * * *" },
  { label: "Daily midnight", value: "0 0 0 * * *" },
  { label: "Weekly Mon 9am", value: "0 0 9 * * 1" },
  { label: "Every 30min", value: "0 */30 * * * *" },
];

const AGENTS = ["nanoclaw", "cortex", "scout", "browser-worker"];

interface ScheduleFormData {
  agentId: string;
  name: string;
  description: string;
  cronExpression: string;
  taskPrompt: string;
}

const EMPTY_FORM: ScheduleFormData = {
  agentId: "nanoclaw",
  name: "",
  description: "",
  cronExpression: "0 0 9 * * *",
  taskPrompt: "",
};

export default function AgentSchedules() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ScheduleFormData>(EMPTY_FORM);
  const [filterAgent, setFilterAgent] = useState<string | undefined>(undefined);

  const { data: schedules = [], refetch, isLoading } = trpc.schedules.list.useQuery(
    { agentId: filterAgent },
    { refetchInterval: 15000 }
  );

  const createMut = trpc.schedules.create.useMutation({
    onSuccess: () => {
      toast.success("Schedule created");
      setShowForm(false);
      setForm(EMPTY_FORM);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMut = trpc.schedules.toggle.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.schedules.delete.useMutation({
    onSuccess: () => {
      toast.success("Schedule deleted");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const runNowMut = trpc.schedules.runNow.useMutation({
    onSuccess: (d) => {
      toast.success(`Dispatched as browser task #${d.taskId}`);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const statusIcon = (s: string | null) => {
    if (!s) return null;
    if (s === "success") return <CheckCircle size={12} style={{ color: "#10B981" }} />;
    if (s === "error") return <XCircle size={12} style={{ color: "#EF4444" }} />;
    return <Loader2 size={12} className="animate-spin" style={{ color: "#00B4D8" }} />;
  };

  return (
    <IVLayout>
      <div className="flex flex-col h-full" style={{ backgroundColor: "var(--iv-navy)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--iv-border)" }}>
          <div className="flex items-center gap-3">
            <CalendarClock size={20} style={{ color: "var(--iv-blue)" }} />
            <h1 className="text-lg font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--iv-text)" }}>
              Agent Schedules
            </h1>
            <Badge style={{ backgroundColor: "rgba(0,180,216,0.15)", color: "var(--iv-blue)", border: "1px solid rgba(0,180,216,0.3)" }}>
              {schedules.length} schedules
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterAgent ?? ""}
              onChange={e => setFilterAgent(e.target.value || undefined)}
              className="text-xs h-8 px-2 rounded-lg"
              style={{ backgroundColor: "var(--iv-surface)", borderColor: "var(--iv-border)", color: "var(--iv-text)", border: "1px solid var(--iv-border)" }}
            >
              <option value="">All agents</option>
              {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <Button
              size="sm"
              onClick={() => setShowForm(!showForm)}
              style={{ backgroundColor: "var(--iv-blue)", color: "#0A2342" }}
            >
              <Plus size={14} className="mr-1" /> New Schedule
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Create form */}
          {showForm && (
            <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: "var(--iv-surface)", border: "1px solid var(--iv-border)" }}>
              <div className="text-sm font-bold mb-4" style={{ color: "var(--iv-text)", fontFamily: "'Syne', sans-serif" }}>
                New Agent Schedule
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--iv-muted)" }}>Agent</label>
                  <select
                    value={form.agentId}
                    onChange={e => setForm(f => ({ ...f, agentId: e.target.value }))}
                    className="w-full text-sm h-9 px-3 rounded-lg"
                    style={{ backgroundColor: "var(--iv-navy)", border: "1px solid var(--iv-border)", color: "var(--iv-text)" }}
                  >
                    {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--iv-muted)" }}>Name</label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Daily news digest"
                    className="h-9 text-sm"
                    style={{ backgroundColor: "var(--iv-navy)", borderColor: "var(--iv-border)", color: "var(--iv-text)" }}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="text-xs mb-1 block" style={{ color: "var(--iv-muted)" }}>Cron Expression (6-field: sec min hour dom mon dow)</label>
                <div className="flex gap-2 flex-wrap mb-1">
                  {CRON_PRESETS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setForm(f => ({ ...f, cronExpression: p.value }))}
                      className="text-xs px-2 py-1 rounded transition-all"
                      style={{
                        backgroundColor: form.cronExpression === p.value ? "rgba(0,180,216,0.2)" : "var(--iv-navy)",
                        color: form.cronExpression === p.value ? "var(--iv-blue)" : "var(--iv-muted)",
                        border: `1px solid ${form.cronExpression === p.value ? "rgba(0,180,216,0.5)" : "var(--iv-border)"}`,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <Input
                  value={form.cronExpression}
                  onChange={e => setForm(f => ({ ...f, cronExpression: e.target.value }))}
                  placeholder="0 0 9 * * *"
                  className="h-9 text-sm font-mono"
                  style={{ backgroundColor: "var(--iv-navy)", borderColor: "var(--iv-border)", color: "var(--iv-text)" }}
                />
              </div>
              <div className="mb-3">
                <label className="text-xs mb-1 block" style={{ color: "var(--iv-muted)" }}>Task Prompt</label>
                <Textarea
                  value={form.taskPrompt}
                  onChange={e => setForm(f => ({ ...f, taskPrompt: e.target.value }))}
                  placeholder="What should the agent do when this schedule fires?"
                  rows={3}
                  className="text-sm"
                  style={{ backgroundColor: "var(--iv-navy)", borderColor: "var(--iv-border)", color: "var(--iv-text)" }}
                />
              </div>
              <div className="mb-4">
                <label className="text-xs mb-1 block" style={{ color: "var(--iv-muted)" }}>Description (optional)</label>
                <Input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description"
                  className="h-9 text-sm"
                  style={{ backgroundColor: "var(--iv-navy)", borderColor: "var(--iv-border)", color: "var(--iv-text)" }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => createMut.mutate(form)}
                  disabled={createMut.isPending || !form.name.trim() || !form.taskPrompt.trim()}
                  style={{ backgroundColor: "var(--iv-blue)", color: "#0A2342" }}
                >
                  {createMut.isPending ? "Creating..." : "Create Schedule"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)} style={{ borderColor: "var(--iv-border)", color: "var(--iv-text)" }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Schedule list */}
          {isLoading ? (
            <div className="flex items-center justify-center h-32" style={{ color: "var(--iv-muted)" }}>
              <Loader2 size={16} className="animate-spin mr-2" /> Loading schedules...
            </div>
          ) : schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3" style={{ color: "var(--iv-muted)" }}>
              <CalendarClock size={40} />
              <div className="text-sm">No schedules yet</div>
              <div className="text-xs">Create a schedule to automate recurring agent tasks</div>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map(schedule => (
                <div
                  key={schedule.id}
                  className="rounded-xl p-4 transition-all"
                  style={{
                    backgroundColor: "var(--iv-surface)",
                    border: `1px solid ${schedule.isEnabled ? "var(--iv-border)" : "rgba(255,255,255,0.05)"}`,
                    opacity: schedule.isEnabled ? 1 : 0.6,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold" style={{ color: "var(--iv-text)", fontFamily: "'Syne', sans-serif" }}>
                          {schedule.name}
                        </span>
                        <Badge variant="outline" className="text-xs" style={{ borderColor: "var(--iv-border)", color: "var(--iv-muted)" }}>
                          {schedule.agentId}
                        </Badge>
                        {!schedule.isEnabled && (
                          <Badge variant="outline" className="text-xs" style={{ borderColor: "rgba(239,68,68,0.3)", color: "#EF4444" }}>
                            paused
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={11} style={{ color: "var(--iv-blue)" }} />
                        <code className="text-xs" style={{ color: "var(--iv-blue)", fontFamily: "'JetBrains Mono', monospace" }}>
                          {schedule.cronExpression}
                        </code>
                      </div>
                      {schedule.description && (
                        <div className="text-xs mb-2" style={{ color: "var(--iv-muted)" }}>{schedule.description}</div>
                      )}
                      <div className="text-xs p-2 rounded" style={{ backgroundColor: "var(--iv-navy)", color: "var(--iv-text)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {schedule.taskPrompt.slice(0, 120)}{schedule.taskPrompt.length > 120 ? "…" : ""}
                      </div>
                      {schedule.lastRunAt && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: "var(--iv-muted)" }}>
                          {statusIcon(schedule.lastRunStatus)}
                          <span>Last run: {new Date(schedule.lastRunAt).toLocaleString()}</span>
                          {schedule.runCount > 0 && <span>· {schedule.runCount} runs</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runNowMut.mutate({ id: schedule.id })}
                        disabled={runNowMut.isPending}
                        title="Run now"
                        style={{ borderColor: "var(--iv-border)", color: "var(--iv-text)" }}
                      >
                        <Play size={12} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleMut.mutate({ id: schedule.id, isEnabled: !schedule.isEnabled })}
                        title={schedule.isEnabled ? "Pause" : "Resume"}
                        style={{ borderColor: "var(--iv-border)", color: schedule.isEnabled ? "#F59E0B" : "#10B981" }}
                      >
                        <Pause size={12} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm("Delete this schedule?")) deleteMut.mutate({ id: schedule.id });
                        }}
                        title="Delete"
                        style={{ borderColor: "rgba(239,68,68,0.3)", color: "#EF4444" }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </IVLayout>
  );
}
