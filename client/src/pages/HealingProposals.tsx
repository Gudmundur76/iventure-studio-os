import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Wrench, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, Eye,
} from "lucide-react";
import { Play } from "lucide-react";

// ── Types (aligned with healingProposals schema) ───────────────────────────

type Proposal = {
  id: number;
  repoId: number | null;
  nodeId: number | null;
  triggerType: "task_error" | "anomaly" | "self_directed";
  triggerRef: string | null;
  issueTitle: string;
  issueDetail: string;
  patchDiff: string | null;
  patchSummary: string | null;
  affectedFiles: string[] | null;
  status: "pending" | "approved" | "dismissed" | "applied" | "failed";
  notificationSent: boolean;
  notificationId: string | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  appliedPrUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function triggerVariant(t: string): "destructive" | "secondary" | "outline" {
  if (t === "task_error") return "destructive";
  if (t === "anomaly") return "secondary";
  return "outline";
}

function statusVariant(s: string): "default" | "secondary" | "outline" | "destructive" {
  if (s === "applied") return "default";
  if (s === "pending") return "secondary";
  if (s === "dismissed") return "outline";
  if (s === "failed") return "destructive";
  return "outline";
}

function statusIcon(s: string) {
  if (s === "applied") return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
  if (s === "pending") return <Clock className="h-3.5 w-3.5 text-amber-500" />;
  if (s === "dismissed") return <XCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  if (s === "failed") return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
  return null;
}

// ── Diff View ──────────────────────────────────────────────────────────────

function DiffView({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  return (
    <pre className="text-xs font-mono overflow-auto max-h-[400px] bg-muted/50 rounded-md p-3 leading-5">
      {lines.map((line, i) => {
        const cls = line.startsWith("+") && !line.startsWith("+++")
          ? "text-green-500 bg-green-500/10 block"
          : line.startsWith("-") && !line.startsWith("---")
          ? "text-red-500 bg-red-500/10 block"
          : line.startsWith("@@")
          ? "text-blue-400 block"
          : "block";
        return <span key={i} className={cls}>{line || " "}</span>;
      })}
    </pre>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function HealingProposals() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [scanning, setScanning] = useState(false);

  async function handleScanNow() {
    setScanning(true);
    try {
      const res = await fetch("/api/scheduled/awareness-loop", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Scan complete — ${data.proposalsCreated ?? 0} proposal(s) created`);
        utils.healing.list.invalidate();
        utils.healing.stats.invalidate();
      } else {
        toast.error("Scan failed — check server logs");
      }
    } catch {
      toast.error("Could not reach the awareness-loop endpoint");
    } finally {
      setScanning(false);
    }
  }

  const { data: rawProposals = [], isLoading } = trpc.healing.list.useQuery(
    { status: statusFilter === "all" ? undefined : statusFilter }
  );
  const proposals = rawProposals as unknown as Proposal[];

  const { data: stats } = trpc.healing.stats.useQuery();

  const approveMut = trpc.healing.approve.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Fix applied successfully");
      } else {
        toast.error(`Fix failed: ${result.message}`);
      }
      utils.healing.list.invalidate();
      utils.healing.stats.invalidate();
      setSelectedProposal(null);
    },
    onError: (e) => {
      toast.error(`Approval failed: ${e.message}`);
      utils.healing.list.invalidate();
    },
  });

  const dismissMut = trpc.healing.dismiss.useMutation({
    onSuccess: () => {
      toast.success("Proposal dismissed");
      utils.healing.list.invalidate();
      utils.healing.stats.invalidate();
      setSelectedProposal(null);
    },
    onError: (e) => {
      toast.error(`Dismiss failed: ${e.message}`);
      utils.healing.list.invalidate();
    },
  });

  const pendingCount = stats?.pending ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Healing Proposals</h1>
            <p className="text-sm text-muted-foreground">Mr. Agent's self-healing suggestions — approve or dismiss each fix</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              {pendingCount} pending
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleScanNow}
            disabled={scanning}
            className="gap-2"
          >
            {scanning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {scanning ? "Scanning…" : "Scan Now"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={pendingCount > 0 ? "border-amber-500/30" : ""}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className={`text-2xl font-bold ${pendingCount > 0 ? "text-amber-500" : ""}`}>{stats?.pending ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Applied</p>
            <p className="text-2xl font-bold text-green-500">{stats?.applied ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Dismissed</p>
            <p className="text-2xl font-bold text-muted-foreground">{stats?.dismissed ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold text-destructive">{stats?.failed ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Proposals</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : proposals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">
                {statusFilter === "pending"
                  ? "No pending proposals — Mr. Agent hasn't found any issues yet"
                  : `No ${statusFilter} proposals`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Issue</TableHead>
                  <TableHead className="text-xs">Affected Files</TableHead>
                  <TableHead className="text-xs">Trigger</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((proposal) => (
                  <TableRow
                    key={proposal.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedProposal(proposal)}
                  >
                    <TableCell className="text-xs font-medium max-w-[180px] truncate">{proposal.issueTitle}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                      {proposal.affectedFiles?.slice(0, 2).join(", ") ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant={triggerVariant(proposal.triggerType)} className="text-xs">
                        {proposal.triggerType.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        {statusIcon(proposal.status)}
                        <span className="capitalize">{proposal.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(proposal.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      {proposal.status === "pending" ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-6 text-xs px-2 bg-green-600 hover:bg-green-700"
                            onClick={() => approveMut.mutate({ id: proposal.id })}
                            disabled={approveMut.isPending}
                          >
                            {approveMut.isPending && approveMut.variables?.id === proposal.id
                              ? <RefreshCw className="h-3 w-3 animate-spin" />
                              : <CheckCircle className="h-3 w-3 mr-1" />
                            }
                            Yes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2"
                            onClick={() => dismissMut.mutate({ id: proposal.id })}
                            disabled={dismissMut.isPending}
                          >
                            {dismissMut.isPending && dismissMut.variables?.id === proposal.id
                              ? <RefreshCw className="h-3 w-3 animate-spin" />
                              : <XCircle className="h-3 w-3 mr-1" />
                            }
                            No
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Proposal detail dialog */}
      <Dialog open={!!selectedProposal} onOpenChange={(open) => { if (!open) setSelectedProposal(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              {selectedProposal?.issueTitle}
            </DialogTitle>
          </DialogHeader>
          {selectedProposal && (
            <div className="space-y-4">
              {/* Meta */}
              <div className="flex flex-wrap gap-2">
                <Badge variant={triggerVariant(selectedProposal.triggerType)}>
                  {selectedProposal.triggerType.replace(/_/g, " ")}
                </Badge>
                <Badge variant={statusVariant(selectedProposal.status)} className="capitalize">
                  {selectedProposal.status}
                </Badge>
              </div>

              {/* Affected files */}
              {selectedProposal.affectedFiles && selectedProposal.affectedFiles.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Affected Files</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedProposal.affectedFiles.map((f, i) => (
                      <code key={i} className="text-xs bg-muted px-2 py-1 rounded">{f}</code>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{selectedProposal.issueDetail}</p>
              </div>

              {/* Patch summary */}
              {selectedProposal.patchSummary && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Patch Summary</p>
                  <p className="text-sm text-muted-foreground">{selectedProposal.patchSummary}</p>
                </div>
              )}

              {/* Diff */}
              {selectedProposal.patchDiff && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Proposed Patch</p>
                  <DiffView diff={selectedProposal.patchDiff} />
                </div>
              )}

              {/* Actions */}
              {selectedProposal.status === "pending" && (
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    onClick={() => dismissMut.mutate({ id: selectedProposal.id })}
                    disabled={dismissMut.isPending}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    No — Dismiss
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 gap-2"
                    onClick={() => approveMut.mutate({ id: selectedProposal.id })}
                    disabled={approveMut.isPending}
                  >
                    {approveMut.isPending
                      ? <RefreshCw className="h-4 w-4 animate-spin" />
                      : <CheckCircle className="h-4 w-4" />
                    }
                    Yes — Apply Fix
                  </Button>
                </div>
              )}

              {selectedProposal.resolvedAt && (
                <p className="text-xs text-muted-foreground text-right">
                  {selectedProposal.status === "applied" ? "Applied" : "Resolved"} on{" "}
                  {new Date(selectedProposal.resolvedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
