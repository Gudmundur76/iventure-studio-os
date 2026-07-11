import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const REGION_LABELS: Record<string, string> = {
  "eu-central": "🇩🇪 EU Central",
  "eu-west": "🇮🇪 EU West",
  "us-east": "🇺🇸 US East",
  "us-west": "🇺🇸 US West",
  "ap-southeast": "🇸🇬 AP Southeast",
  "is-reykjavik": "🇮🇸 Iceland",
};

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "online" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
    status === "offline" ? "bg-red-500/20 text-red-400 border-red-500/30" :
    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "online" ? "bg-emerald-400 animate-pulse" : status === "offline" ? "bg-red-400" : "bg-yellow-400"}`} />
      {status}
    </span>
  );
}

export default function SandboxNodes() {
  const utils = trpc.useUtils();
  const { data: nodes = [], isLoading } = trpc.sandbox.nodes.useQuery();
  const { data: coordHealth } = trpc.sandbox.coordinatorHealth.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const pollHealth = trpc.sandbox.pollHealth.useMutation({
    onSuccess: (d) => {
      toast.success(`Health polled — ${d.updated} node(s) updated`);
      utils.sandbox.nodes.invalidate();
    },
  });
  const registerNode = trpc.sandbox.registerNode.useMutation({
    onSuccess: () => {
      toast.success("Node registered successfully");
      utils.sandbox.nodes.invalidate();
      setForm({ nodeId: "", label: "", url: "", region: "eu-central", secret: "" });
    },
    onError: (e) => toast.error(e.message),
  });
  const removeNode = trpc.sandbox.removeNode.useMutation({
    onSuccess: () => {
      toast.success("Node removed");
      utils.sandbox.nodes.invalidate();
    },
  });

  const [form, setForm] = useState({ nodeId: "", label: "", url: "", region: "eu-central", secret: "" });
  const [showForm, setShowForm] = useState(false);

  const totalSlots = nodes.reduce((acc, n) => {
    const h = n.healthData as any;
    return acc + (h?.max_concurrent_sandboxes ?? 0);
  }, 0);
  const availableSlots = nodes.reduce((acc, n) => {
    const h = n.healthData as any;
    return acc + (h?.available_slots ?? 0);
  }, 0);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sandbox Nodes</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Distributed Docker sandbox pool — isolated execution across VPS nodes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => pollHealth.mutate()}
            disabled={pollHealth.isPending}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            {pollHealth.isPending ? "Polling…" : "↻ Poll Health"}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="bg-violet-600 hover:bg-violet-500 text-white"
          >
            {showForm ? "Cancel" : "+ Add Node"}
          </Button>
        </div>
      </div>

      {/* Coordinator status */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Coordinator</p>
              <StatusBadge status={coordHealth?.status === "ok" ? "online" : "offline"} />
            </div>
            <Separator orientation="vertical" className="h-8 bg-zinc-700" />
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Nodes</p>
              <p className="text-lg font-semibold text-white">{coordHealth?.nodes ?? nodes.length}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Slots</p>
              <p className="text-lg font-semibold text-white">{coordHealth?.total_slots ?? totalSlots}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Available</p>
              <p className="text-lg font-semibold text-emerald-400">{coordHealth?.available_slots ?? availableSlots}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Active Sandboxes</p>
              <p className="text-lg font-semibold text-amber-400">{coordHealth?.active_sandboxes ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add node form */}
      {showForm && (
        <Card className="bg-zinc-900 border-violet-700/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">Register New Node</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Node ID</label>
                <Input
                  placeholder="node-eu-2"
                  value={form.nodeId}
                  onChange={(e) => setForm({ ...form, nodeId: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Label</label>
                <Input
                  placeholder="Frankfurt VPS 2"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Agent URL</label>
                <Input
                  placeholder="http://1.2.3.4:8900"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Region</label>
                <select
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className="w-full h-9 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3"
                >
                  {Object.entries(REGION_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-zinc-400 mb-1 block">Agent Secret (optional)</label>
                <Input
                  type="password"
                  placeholder="Leave blank to use default"
                  value={form.secret}
                  onChange={(e) => setForm({ ...form, secret: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <Button
              onClick={() => registerNode.mutate(form)}
              disabled={registerNode.isPending || !form.nodeId || !form.url}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              {registerNode.isPending ? "Registering…" : "Register Node"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Node list */}
      {isLoading ? (
        <p className="text-zinc-500 text-sm">Loading nodes…</p>
      ) : nodes.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <p className="text-zinc-400 text-sm">No nodes registered yet.</p>
            <p className="text-zinc-600 text-xs mt-1">Add a VPS node above to start the sandbox pool.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {nodes.map((node) => {
            const h = node.healthData as any;
            return (
              <Card key={node.nodeId} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white">{node.label}</span>
                        <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                          {REGION_LABELS[node.region] ?? node.region}
                        </Badge>
                        <StatusBadge status={node.status} />
                      </div>
                      <p className="text-xs text-zinc-500 font-mono truncate">{node.url}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">ID: {node.nodeId}</p>
                    </div>
                    <div className="flex items-center gap-6 text-center shrink-0">
                      {h && (
                        <>
                          <div>
                            <p className="text-xs text-zinc-500">Slots</p>
                            <p className="text-sm font-semibold text-emerald-400">
                              {h.available_slots ?? "—"}/{h.max_concurrent_sandboxes ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Active</p>
                            <p className="text-sm font-semibold text-amber-400">{h.active_sandboxes ?? 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Image</p>
                            <p className="text-xs text-zinc-400 max-w-[120px] truncate">{h.sandbox_image ?? "—"}</p>
                          </div>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNode.mutate({ nodeId: node.nodeId })}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  {node.lastHealthAt && (
                    <p className="text-xs text-zinc-600 mt-2">
                      Last polled: {new Date(node.lastHealthAt * 1000).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
