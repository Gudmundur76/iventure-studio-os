import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const JOB_LABELS: Record<string, { label: string; icon: string; description: string }> = {
  "memory-sync": {
    label: "Memory Sync",
    icon: "🧠",
    description: "Extracts NanoClaw conversation threads into the memory graph",
  },
  "cortex-digest": {
    label: "Cortex Digest",
    icon: "⚡",
    description: "Generates daily intelligence digest from recent agent activity",
  },
};

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <Badge variant="outline" className="text-xs">never run</Badge>;
  if (status === "success") return <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">success</Badge>;
  if (status === "error") return <Badge className="bg-red-600/20 text-red-400 border-red-600/30 text-xs">error</Badge>;
  if (status === "running") return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 text-xs animate-pulse">running</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

function formatRelative(date: Date | null | undefined) {
  if (!date) return "—";
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString();
}

export default function SchedulesPanel() {
  const [triggering, setTriggering] = useState<string | null>(null);

  const { data: jobs = [], refetch: refetchJobs } = trpc.schedule.jobs.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const { data: logs = [], refetch: refetchLogs } = trpc.schedule.logs.useQuery(
    { limit: 30 },
    { refetchInterval: 15000 }
  );
  const seedMutation = trpc.schedule.seed.useMutation({
    onSuccess: () => {
      toast.success("Scheduled jobs seeded");
      refetchJobs();
    },
  });

  async function triggerJob(jobName: string) {
    setTriggering(jobName);
    try {
      const res = await fetch("/api/scheduled/manual-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobName }),
        credentials: "include",
      });
      const data = await res.json() as { ok?: boolean; message?: string; error?: string };
      if (data.ok) {
        toast.success(`${jobName} completed: ${data.message?.slice(0, 80) ?? "done"}`);
      } else {
        toast.error(`${jobName} failed: ${data.error ?? "unknown error"}`);
      }
    } catch (e) {
      toast.error(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTriggering(null);
      refetchJobs();
      refetchLogs();
    }
  }

  return (
    <div className="min-h-screen bg-[var(--iv-navy)] text-[var(--iv-text)] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Scheduled Jobs</h1>
            <p className="text-sm text-[var(--iv-text-muted)] mt-1">
              Automated loops that compound the knowledge graph over time
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="border-[var(--iv-border)] text-[var(--iv-text-muted)] hover:text-white"
          >
            {jobs.length === 0 ? "Register Jobs" : "Refresh Registry"}
          </Button>
        </div>

        {/* Job Cards */}
        {jobs.length === 0 ? (
          <Card className="iv-card border-dashed">
            <CardContent className="py-12 text-center text-[var(--iv-text-muted)]">
              <div className="text-4xl mb-3">⏱</div>
              <p className="text-sm">No jobs registered yet.</p>
              <p className="text-xs mt-1">Click "Register Jobs" to seed the schedule registry.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => {
              const meta = JOB_LABELS[job.jobName] ?? { label: job.jobName, icon: "⚙️", description: job.description ?? "" };
              return (
                <Card key={job.id} className="iv-card">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-2xl mt-0.5">{meta.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white">{meta.label}</span>
                            <StatusBadge status={job.lastRunStatus} />
                            {job.isEnabled ? (
                              <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs">enabled</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-[var(--iv-text-muted)]">disabled</Badge>
                            )}
                          </div>
                          <p className="text-xs text-[var(--iv-text-muted)] mt-1">{meta.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--iv-text-muted)]">
                            <span>cron: <code className="text-[var(--iv-blue)]">{job.cronExpression ?? "—"}</code></span>
                            <span>runs: <strong className="text-white">{job.runCount}</strong></span>
                            <span>last: <strong className="text-white">{formatRelative(job.lastRunAt)}</strong></span>
                          </div>
                          {job.lastRunMessage && (
                            <p className="text-xs text-[var(--iv-text-muted)] mt-1 truncate max-w-md" title={job.lastRunMessage}>
                              {job.lastRunMessage}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => triggerJob(job.jobName)}
                        disabled={triggering === job.jobName}
                        className="border-[var(--iv-border)] text-[var(--iv-text-muted)] hover:text-white shrink-0"
                      >
                        {triggering === job.jobName ? "Running…" : "Run Now"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Separator className="bg-[var(--iv-border)]" />

        {/* Run Log */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Run History</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-[var(--iv-text-muted)]">No runs yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--iv-surface)] border border-[var(--iv-border)]">
                  <span className="text-lg mt-0.5">{log.status === "success" ? "✅" : "❌"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-white">{JOB_LABELS[log.jobName]?.label ?? log.jobName}</span>
                      <span className="text-[var(--iv-text-muted)]">·</span>
                      <span className="text-[var(--iv-text-muted)]">{formatRelative(log.createdAt)}</span>
                      {log.durationMs && (
                        <>
                          <span className="text-[var(--iv-text-muted)]">·</span>
                          <span className="text-[var(--iv-text-muted)]">{(log.durationMs / 1000).toFixed(1)}s</span>
                        </>
                      )}
                      <span className="text-[var(--iv-text-muted)]">·</span>
                      <span className="text-[var(--iv-text-muted)]">{log.triggeredBy}</span>
                    </div>
                    {log.message && (
                      <p className="text-xs text-[var(--iv-text-muted)] mt-0.5 truncate" title={log.message}>
                        {log.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
