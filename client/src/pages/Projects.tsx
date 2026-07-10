import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FolderKanban, Plus, CheckCircle2, Clock, AlertCircle, Zap,
  User, DollarSign, Calendar, ChevronRight, X, Check, Loader2
} from "lucide-react";

const STATUS_ORDER = ["intake", "scoping", "active", "review", "delivered", "archived"] as const;
type Status = typeof STATUS_ORDER[number];
type Priority = "low" | "medium" | "high" | "urgent";

const STATUS_COLOR: Record<Status, string> = {
  intake: "#94a3b8",
  scoping: "#f59e0b",
  active: "var(--iv-blue)",
  review: "#a78bfa",
  delivered: "#00FF87",
  archived: "#475569",
};

const PRIORITY_COLOR: Record<Priority, string> = {
  low: "#64748b",
  medium: "#f59e0b",
  high: "#f97316",
  urgent: "#ef4444",
};

type Project = {
  id: number;
  projectRef: string;
  clientName: string;
  clientEmail?: string | null;
  title: string;
  description?: string | null;
  serviceType?: string | null;
  status: Status;
  priority: Priority;
  budget?: string | null;
  deadline?: Date | null;
  assignedAgent?: string | null;
  deliverables?: { id: string; title: string; done: boolean }[] | null;
  createdAt: Date;
};

type Deliverable = { id: string; title: string; done: boolean };

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full" style={{
      backgroundColor: `${STATUS_COLOR[status]}20`,
      color: STATUS_COLOR[status],
      border: `1px solid ${STATUS_COLOR[status]}40`,
    }}>
      {status.toUpperCase()}
    </span>
  );
}

function PriorityDot({ priority }: { priority: Priority }) {
  return (
    <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLOR[priority] }} title={priority} />
  );
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const deliverables = (project.deliverables ?? []) as Deliverable[];
  const done = deliverables.filter(d => d.done).length;
  return (
    <div
      onClick={onClick}
      className="p-4 rounded-xl cursor-pointer transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]"
      style={{
        backgroundColor: "var(--iv-surface)",
        border: "1px solid var(--iv-border)",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <PriorityDot priority={project.priority} />
          <span className="text-xs font-mono text-[var(--iv-text-muted)]">{project.projectRef}</span>
        </div>
        <StatusBadge status={project.status} />
      </div>
      <h3 className="text-sm font-semibold text-white mb-1 truncate">{project.title}</h3>
      <p className="text-xs text-[var(--iv-text-muted)] mb-3 truncate">{project.clientName}</p>
      <div className="flex items-center justify-between text-xs text-[var(--iv-text-muted)]">
        <div className="flex items-center gap-3">
          {project.assignedAgent && (
            <span className="flex items-center gap-1">
              <User size={10} />
              <span className="truncate max-w-[80px]">{project.assignedAgent}</span>
            </span>
          )}
          {project.budget && (
            <span className="flex items-center gap-1">
              <DollarSign size={10} />
              {project.budget}
            </span>
          )}
        </div>
        {deliverables.length > 0 && (
          <span className="flex items-center gap-1">
            <CheckCircle2 size={10} style={{ color: done === deliverables.length ? "#00FF87" : "var(--iv-text-muted)" }} />
            {done}/{deliverables.length}
          </span>
        )}
      </div>
    </div>
  );
}

function ProjectDetail({ project, onClose, onUpdated }: {
  project: Project;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const utils = trpc.useUtils();
  const [editStatus, setEditStatus] = useState(project.status);
  const [editAgent, setEditAgent] = useState(project.assignedAgent ?? "");
  const [newDeliverable, setNewDeliverable] = useState("");
  const [deliverables, setDeliverables] = useState<Deliverable[]>((project.deliverables ?? []) as Deliverable[]);
  const [saving, setSaving] = useState(false);

  const { data: agents = [] } = trpc.agents.list.useQuery();
  const { data: tasks = [] } = trpc.projects.tasks.useQuery({ projectId: project.id });
  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      onUpdated();
      toast.success("Project updated");
    },
  });

  const save = async () => {
    setSaving(true);
    await updateMutation.mutateAsync({
      id: project.id,
      status: editStatus,
      assignedAgent: editAgent || undefined,
      deliverables,
    });
    setSaving(false);
  };

  const addDeliverable = () => {
    const t = newDeliverable.trim();
    if (!t) return;
    setDeliverables(prev => [...prev, { id: crypto.randomUUID(), title: t, done: false }]);
    setNewDeliverable("");
  };

  const toggleDeliverable = (id: string) => {
    setDeliverables(prev => prev.map(d => d.id === id ? { ...d, done: !d.done } : d));
  };

  const removeDeliverable = (id: string) => {
    setDeliverables(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[var(--iv-text-muted)]">{project.projectRef}</span>
            <PriorityDot priority={project.priority} />
            <span className="text-xs text-[var(--iv-text-muted)] capitalize">{project.priority}</span>
          </div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{project.title}</h2>
          <p className="text-sm text-[var(--iv-text-muted)] mt-1">{project.clientName}{project.clientEmail ? ` · ${project.clientEmail}` : ""}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--iv-text-muted)" }}>
          <X size={16} />
        </button>
      </div>

      {project.description && (
        <p className="text-sm text-[var(--iv-text-muted)] leading-relaxed">{project.description}</p>
      )}

      {/* Status + Agent */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-mono text-[var(--iv-text-muted)] mb-1.5 block">STATUS</label>
          <select
            value={editStatus}
            onChange={e => setEditStatus(e.target.value as Status)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: "var(--iv-surface-2)", border: "1px solid var(--iv-border)", color: "var(--iv-text)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {STATUS_ORDER.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-mono text-[var(--iv-text-muted)] mb-1.5 block">ASSIGNED AGENT</label>
          <select
            value={editAgent}
            onChange={e => setEditAgent(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: "var(--iv-surface-2)", border: "1px solid var(--iv-border)", color: "var(--iv-text)" }}
          >
            <option value="">— unassigned —</option>
            {(agents as { id: number; name: string }[]).map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {/* Deliverables */}
      <div>
        <label className="text-xs font-mono text-[var(--iv-text-muted)] mb-2 block">DELIVERABLES</label>
        <div className="space-y-1.5 mb-2">
          {deliverables.map(d => (
            <div key={d.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--iv-surface-2)", border: "1px solid var(--iv-border)" }}>
              <button onClick={() => toggleDeliverable(d.id)} className="shrink-0 transition-colors">
                {d.done
                  ? <CheckCircle2 size={14} style={{ color: "#00FF87" }} />
                  : <div className="w-3.5 h-3.5 rounded-full border" style={{ borderColor: "var(--iv-border)" }} />
                }
              </button>
              <span className="flex-1 text-sm" style={{ color: d.done ? "var(--iv-text-muted)" : "var(--iv-text)", textDecoration: d.done ? "line-through" : "none" }}>
                {d.title}
              </span>
              <button onClick={() => removeDeliverable(d.id)} className="shrink-0 p-0.5 hover:text-red-400 transition-colors" style={{ color: "var(--iv-text-muted)" }}>
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newDeliverable}
            onChange={e => setNewDeliverable(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addDeliverable()}
            placeholder="Add deliverable..."
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: "var(--iv-surface-2)", border: "1px solid var(--iv-border)", color: "var(--iv-text)" }}
          />
          <button onClick={addDeliverable} className="px-3 py-2 rounded-lg text-sm transition-colors" style={{ backgroundColor: "rgba(0,180,216,0.15)", color: "var(--iv-blue)", border: "1px solid rgba(0,180,216,0.3)" }}>
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Linked tasks */}
      {(tasks as { id: number; prompt: string; status: string; elapsedMs: number | null; createdAt: Date }[]).length > 0 && (
        <div>
          <label className="text-xs font-mono text-[var(--iv-text-muted)] mb-2 block">LINKED TASKS ({tasks.length})</label>
          <div className="space-y-1.5">
            {(tasks as { id: number; prompt: string; status: string; elapsedMs: number | null; createdAt: Date }[]).slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--iv-surface-2)", border: "1px solid var(--iv-border)" }}>
                {t.status === "done" ? <CheckCircle2 size={11} style={{ color: "#00FF87" }} /> :
                  t.status === "error" ? <AlertCircle size={11} style={{ color: "#ef4444" }} /> :
                  <Clock size={11} style={{ color: "#f59e0b" }} />}
                <span className="flex-1 truncate text-[var(--iv-text)]">{t.prompt}</span>
                {t.elapsedMs && <span className="text-[var(--iv-text-muted)] font-mono">{(t.elapsedMs / 1000).toFixed(1)}s</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save */}
      <Button
        onClick={save}
        disabled={saving}
        className="mt-auto"
        style={{ backgroundColor: "var(--iv-blue)", color: "var(--iv-navy)" }}
      >
        {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : <Check size={14} className="mr-2" />}
        Save Changes
      </Button>
    </div>
  );
}

function CreateProjectModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    clientName: "", clientEmail: "", title: "", description: "",
    serviceType: "", priority: "medium" as Priority, budget: "", assignedAgent: "",
  });
  const { data: agents = [] } = trpc.agents.list.useQuery();
  const createMutation = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Project created: ${(data as { projectRef: string }).projectRef}`);
      utils.projects.list.invalidate();
      onCreated();
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!form.clientName.trim() || !form.title.trim()) {
      toast.error("Client name and title are required");
      return;
    }
    createMutation.mutate({
      clientName: form.clientName,
      clientEmail: form.clientEmail || undefined,
      title: form.title,
      description: form.description || undefined,
      serviceType: form.serviceType || undefined,
      priority: form.priority,
      budget: form.budget || undefined,
      assignedAgent: form.assignedAgent || undefined,
    });
  };

  const field = (label: string, key: keyof typeof form, type = "text", placeholder = "") => (
    <div>
      <label className="text-xs font-mono text-[var(--iv-text-muted)] mb-1 block">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ backgroundColor: "var(--iv-surface-2)", border: "1px solid var(--iv-border)", color: "var(--iv-text)" }}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg" style={{ backgroundColor: "var(--iv-surface)", border: "1px solid var(--iv-border)" }}>
        <DialogHeader>
          <DialogTitle className="text-white" style={{ fontFamily: "'Syne', sans-serif" }}>New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {field("CLIENT NAME *", "clientName", "text", "e.g. Acme Corp")}
          {field("CLIENT EMAIL", "clientEmail", "email", "client@example.com")}
          {field("PROJECT TITLE *", "title", "text", "e.g. Brand Identity Redesign")}
          {field("DESCRIPTION", "description", "text", "Brief overview...")}
          <div className="grid grid-cols-2 gap-3">
            {field("SERVICE TYPE", "serviceType", "text", "web-dev, research...")}
            {field("BUDGET", "budget", "text", "e.g. €2,500")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-[var(--iv-text-muted)] mb-1 block">PRIORITY</label>
              <select
                value={form.priority}
                onChange={e => setForm(prev => ({ ...prev, priority: e.target.value as Priority }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: "var(--iv-surface-2)", border: "1px solid var(--iv-border)", color: "var(--iv-text)" }}
              >
                {(["low", "medium", "high", "urgent"] as Priority[]).map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono text-[var(--iv-text-muted)] mb-1 block">ASSIGN AGENT</label>
              <select
                value={form.assignedAgent}
                onChange={e => setForm(prev => ({ ...prev, assignedAgent: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: "var(--iv-surface-2)", border: "1px solid var(--iv-border)", color: "var(--iv-text)" }}
              >
                <option value="">— unassigned —</option>
                {(agents as { id: number; name: string }[]).map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} style={{ borderColor: "var(--iv-border)", color: "var(--iv-text-muted)" }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} style={{ backgroundColor: "var(--iv-blue)", color: "var(--iv-navy)" }}>
            {createMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : <Plus size={14} className="mr-2" />}
            Create Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Projects() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  const { data: projects = [], refetch } = trpc.projects.list.useQuery();
  const typedProjects = projects as Project[];
  const selectedProject = typedProjects.find(p => p.id === selectedId) ?? null;

  const filtered = statusFilter === "all"
    ? typedProjects
    : typedProjects.filter(p => p.status === statusFilter);

  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = typedProjects.filter(p => p.status === s).length;
    return acc;
  }, {} as Record<Status, number>);

  return (
    <div className="flex h-full overflow-hidden" style={{ backgroundColor: "var(--iv-navy)" }}>
      {/* Left panel — project list */}
      <div className="flex flex-col w-full" style={{ maxWidth: selectedProject ? "420px" : "100%", borderRight: selectedProject ? "1px solid var(--iv-border)" : "none" }}>
        {/* Header */}
        <div className="shrink-0 px-6 py-4 flex items-center gap-4" style={{ borderBottom: "1px solid var(--iv-border)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
            <FolderKanban size={18} style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <div className="text-base font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Projects</div>
            <div className="text-xs font-mono text-[var(--iv-text-muted)]">{typedProjects.length} total · {counts.active ?? 0} active</div>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="ml-auto flex items-center gap-1.5"
            style={{ backgroundColor: "var(--iv-blue)", color: "var(--iv-navy)" }}
          >
            <Plus size={13} />
            New
          </Button>
        </div>

        {/* Status filter */}
        <div className="shrink-0 px-4 py-2 flex items-center gap-1 overflow-x-auto" style={{ borderBottom: "1px solid var(--iv-border)" }}>
          <button
            onClick={() => setStatusFilter("all")}
            className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold whitespace-nowrap transition-colors shrink-0"
            style={{
              backgroundColor: statusFilter === "all" ? "rgba(0,180,216,0.15)" : "transparent",
              color: statusFilter === "all" ? "var(--iv-blue)" : "var(--iv-text-muted)",
              border: statusFilter === "all" ? "1px solid rgba(0,180,216,0.3)" : "1px solid transparent",
            }}
          >
            ALL ({typedProjects.length})
          </button>
          {STATUS_ORDER.filter(s => s !== "archived").map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold whitespace-nowrap transition-colors shrink-0"
              style={{
                backgroundColor: statusFilter === s ? `${STATUS_COLOR[s]}20` : "transparent",
                color: statusFilter === s ? STATUS_COLOR[s] : "var(--iv-text-muted)",
                border: statusFilter === s ? `1px solid ${STATUS_COLOR[s]}40` : "1px solid transparent",
              }}
            >
              {s.toUpperCase()} ({counts[s] ?? 0})
            </button>
          ))}
        </div>

        {/* Project grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[var(--iv-text-muted)]">
              <FolderKanban size={32} className="mb-3 opacity-30" />
              <p className="text-sm">{statusFilter === "all" ? "No projects yet" : `No ${statusFilter} projects`}</p>
              {statusFilter === "all" && (
                <button onClick={() => setCreateOpen(true)} className="mt-2 text-xs text-[var(--iv-blue)] hover:underline">Create your first project →</button>
              )}
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: selectedProject ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {filtered.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — project detail */}
      {selectedProject && (
        <div className="flex-1 overflow-hidden" style={{ minWidth: 0 }}>
          <ProjectDetail
            project={selectedProject}
            onClose={() => setSelectedId(null)}
            onUpdated={() => refetch()}
          />
        </div>
      )}

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => refetch()}
      />
    </div>
  );
}
