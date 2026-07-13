import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  GitBranch, RefreshCw, Play, Plus, AlertTriangle,
  FileCode, Network, Search, ToggleLeft, ToggleRight,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────

function anomalyColor(type: string | null | undefined) {
  if (!type) return null;
  if (type === "high_complexity") return "destructive";
  if (type === "large_file") return "secondary";
  if (type === "high_todo_density") return "outline";
  return "secondary";
}

function sourceLabel(source: string) {
  if (source === "local") return "Local";
  if (source === "ssh") return "SSH";
  return "GitHub";
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CodeGraph() {
  const utils = trpc.useUtils();

  // Repos
  const { data: repos = [], isLoading: reposLoading } = trpc.codeGraph.listRepos.useQuery();
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [anomalyOnly, setAnomalyOnly] = useState(false);
  const [nodeSearch, setNodeSearch] = useState("");
  const [showAddRepo, setShowAddRepo] = useState(false);

  // Nodes
  const { data: nodes = [], isLoading: nodesLoading } = trpc.codeGraph.listNodes.useQuery(
    { repoId: selectedRepoId ?? undefined, anomalyOnly, limit: 200 },
    { enabled: selectedRepoId != null }
  );

  // Anomalies
  const { data: anomalies = [] } = trpc.codeGraph.getAnomalies.useQuery(
    { repoId: selectedRepoId ?? undefined },
    { enabled: true }
  );

  // Mutations
  const scanRepoMut = trpc.codeGraph.scanRepo.useMutation({
    onSuccess: (result) => {
      toast.success(`Scan complete — ${result.nodesWritten} nodes, ${result.anomaliesFound} anomalies`);
      utils.codeGraph.listRepos.invalidate();
      utils.codeGraph.listNodes.invalidate();
      utils.codeGraph.getAnomalies.invalidate();
    },
    onError: (e) => toast.error(`Scan failed: ${e.message}`),
  });

  const scanAllMut = trpc.codeGraph.scanAll.useMutation({
    onSuccess: (results) => {
      const total = results.reduce((s, r) => s + r.nodesWritten, 0);
      const errors = results.filter(r => r.error).length;
      toast.success(`Scanned ${results.length} repos — ${total} nodes total${errors ? `, ${errors} errors` : ""}`);
      utils.codeGraph.listRepos.invalidate();
      utils.codeGraph.listNodes.invalidate();
      utils.codeGraph.getAnomalies.invalidate();
    },
    onError: (e) => toast.error(`Scan all failed: ${e.message}`),
  });

  const runAwarenessMut = trpc.codeGraph.runAwareness.useMutation({
    onSuccess: (result) => {
      toast.success(`Awareness loop complete — ${result.proposalsCreated} proposals created`);
      if (result.errors.length > 0) toast.warning(`${result.errors.length} errors during scan`);
    },
    onError: (e) => toast.error(`Awareness loop failed: ${e.message}`),
  });

  const toggleRepoMut = trpc.codeGraph.toggleRepo.useMutation({
    onSuccess: () => utils.codeGraph.listRepos.invalidate(),
  });

  const addRepoMut = trpc.codeGraph.addRepo.useMutation({
    onSuccess: () => {
      toast.success("Repo added");
      setShowAddRepo(false);
      utils.codeGraph.listRepos.invalidate();
    },
    onError: (e) => toast.error(`Failed to add repo: ${e.message}`),
  });

  // Add repo form state
  const [newRepo, setNewRepo] = useState({ name: "", source: "local" as "local" | "ssh" | "github", path: "", language: "typescript" });

  // Filter nodes by search
  const filteredNodes = nodes.filter(n =>
    !nodeSearch || n.name.toLowerCase().includes(nodeSearch.toLowerCase()) || n.filePath.toLowerCase().includes(nodeSearch.toLowerCase())
  );

  const selectedRepo = repos.find(r => r.id === selectedRepoId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Network className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Code Graph</h1>
            <p className="text-sm text-muted-foreground">Mr. Agent's live map of the meta-OS codebase</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runAwarenessMut.mutate()}
            disabled={runAwarenessMut.isPending}
          >
            {runAwarenessMut.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Run Awareness Loop
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => scanAllMut.mutate()}
            disabled={scanAllMut.isPending}
          >
            {scanAllMut.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Scan All
          </Button>
          <Button size="sm" onClick={() => setShowAddRepo(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Repo
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Repos</p>
            <p className="text-2xl font-bold">{repos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Nodes</p>
            <p className="text-2xl font-bold">{repos.reduce((s, r) => s + r.nodeCount, 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Edges</p>
            <p className="text-2xl font-bold">{repos.reduce((s, r) => s + r.edgeCount, 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Anomalies</p>
            <p className="text-2xl font-bold text-amber-500">{anomalies.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Repo list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Repositories</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {reposLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : repos.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No repos yet. Click "Add Repo" to register one.</p>
            ) : (
              <div className="divide-y">
                {repos.map(repo => (
                  <div
                    key={repo.id}
                    className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedRepoId === repo.id ? "bg-muted" : ""}`}
                    onClick={() => setSelectedRepoId(repo.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{repo.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Badge variant="outline" className="text-xs">{sourceLabel(repo.source)}</Badge>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleRepoMut.mutate({ id: repo.id, isActive: !repo.isActive }); }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {repo.isActive ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{repo.nodeCount} nodes</span>
                      <span>{repo.edgeCount} edges</span>
                      {repo.lastScannedAt && <span>Scanned {new Date(repo.lastScannedAt).toLocaleDateString()}</span>}
                    </div>
                    {selectedRepoId === repo.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-6 text-xs w-full"
                        onClick={(e) => { e.stopPropagation(); scanRepoMut.mutate({ repoId: repo.id }); }}
                        disabled={scanRepoMut.isPending}
                      >
                        {scanRepoMut.isPending ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                        Scan Now
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Node explorer */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {selectedRepo ? `${selectedRepo.name} — Nodes` : "Select a repo to explore nodes"}
                </CardTitle>
                {selectedRepoId != null && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant={anomalyOnly ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setAnomalyOnly(!anomalyOnly)}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Anomalies only
                    </Button>
                  </div>
                )}
              </div>
              {selectedRepoId != null && (
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search nodes..."
                    value={nodeSearch}
                    onChange={e => setNodeSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 overflow-auto max-h-[500px]">
              {selectedRepoId == null ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Network className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Select a repository from the left</p>
                </div>
              ) : nodesLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : filteredNodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <FileCode className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">{nodes.length === 0 ? "No nodes yet — run a scan first" : "No nodes match your filter"}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">File</TableHead>
                      <TableHead className="text-xs">LOC</TableHead>
                      <TableHead className="text-xs">Complexity</TableHead>
                      <TableHead className="text-xs">Anomaly</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNodes.map(node => (
                      <TableRow key={node.id} className={node.anomalyType ? "bg-amber-500/5" : ""}>
                        <TableCell className="text-xs font-medium max-w-[120px] truncate">{node.name}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-xs">{node.nodeType}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate" title={node.filePath}>
                          {node.filePath}
                        </TableCell>
                        <TableCell className="text-xs">{node.linesOfCode}</TableCell>
                        <TableCell className="text-xs">
                          {node.complexity > 0 ? (
                            <span className={node.complexity > 15 ? "text-destructive font-medium" : ""}>{node.complexity}</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {node.anomalyType ? (
                            <Badge variant={anomalyColor(node.anomalyType) as any} className="text-xs">
                              {node.anomalyType.replace(/_/g, " ")}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Anomaly summary */}
      {anomalies.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Anomaly Summary ({anomalies.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto max-h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">File</TableHead>
                  <TableHead className="text-xs">Node</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anomalies.map(a => (
                  <TableRow key={a.nodeId}>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{a.filePath}</TableCell>
                    <TableCell className="text-xs font-medium">{a.name}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant={anomalyColor(a.anomalyType) as any} className="text-xs">
                        {a.anomalyType.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{a.anomalyDetail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Repo Dialog */}
      <Dialog open={showAddRepo} onOpenChange={setShowAddRepo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Repository</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newRepo.name}
                onChange={e => setNewRepo(r => ({ ...r, name: e.target.value }))}
                placeholder="e.g. nanoclaw"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Source</label>
              <Select value={newRepo.source} onValueChange={v => setNewRepo(r => ({ ...r, source: v as any }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local (this server)</SelectItem>
                  <SelectItem value="ssh">SSH (remote VPS)</SelectItem>
                  <SelectItem value="github">GitHub</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">
                {newRepo.source === "ssh" ? "SSH Path (user@host:/path)" : "Absolute Path"}
              </label>
              <Input
                value={newRepo.path}
                onChange={e => setNewRepo(r => ({ ...r, path: e.target.value }))}
                placeholder={newRepo.source === "ssh" ? "root@187.124.213.194:/opt/nanoclaw" : "/opt/myapp"}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Language</label>
              <Select value={newRepo.language} onValueChange={v => setNewRepo(r => ({ ...r, language: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="go">Go</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddRepo(false)}>Cancel</Button>
              <Button
                onClick={() => addRepoMut.mutate(newRepo)}
                disabled={!newRepo.name || !newRepo.path || addRepoMut.isPending}
              >
                {addRepoMut.isPending ? "Adding..." : "Add Repository"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
