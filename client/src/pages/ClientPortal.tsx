import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { FolderKanban, Plus, X, ChevronDown } from "lucide-react";
import IVPageHeader from "@/components/IVPageHeader";
import { toast } from "sonner";

const STATUS_COLS = [
  { key: "intake", label: "Intake", color: "var(--iv-text-muted)" },
  { key: "scoping", label: "Scoping", color: "#f59e0b" },
  { key: "active", label: "Active", color: "var(--iv-blue)" },
  { key: "review", label: "Review", color: "#8b5cf6" },
  { key: "delivered", label: "Delivered", color: "var(--iv-green)" },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  low: "var(--iv-text-muted)", medium: "var(--iv-blue)", high: "#f59e0b", urgent: "var(--iv-red)"
};

const AGENTS = ["vmoa-commander","vmoa-financial","vmoa-legal","vmoa-marketing","vmoa-technical","vmoa-research","vmoa-data"];

export default function ClientPortal() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientName: "", clientEmail: "", title: "", description: "", serviceType: "", priority: "medium" as "low"|"medium"|"high"|"urgent", budget: "", assignedAgent: "" });

  const { data: projects = [], refetch } = trpc.projects.list.useQuery();
  const createMutation = trpc.projects.create.useMutation();
  const updateMutation = trpc.projects.updateStatus.useMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName || !form.title) return;
    try {
      const result = await createMutation.mutateAsync(form);
      toast.success(`Project ${result.projectRef} created`);
      setForm({ clientName: "", clientEmail: "", title: "", description: "", serviceType: "", priority: "medium", budget: "", assignedAgent: "" });
      setShowForm(false);
      refetch();
    } catch { toast.error("Failed to create project"); }
  };

  const handleStatusUpdate = async (id: number, status: "intake"|"scoping"|"active"|"review"|"delivered"|"archived") => {
    await updateMutation.mutateAsync({ id, status });
    refetch();
  };

  return (
    <div className="flex flex-col h-full">
      <IVPageHeader
        title="Client Portal"
        subtitle="Project intake, delivery tracking, and status board"
        badge={`${projects.length} projects`}
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: "var(--iv-blue)", color: "var(--iv-navy)" }}
          >
            <Plus size={13} />New Project
          </button>
        }
      />

      {/* Intake form */}
      {showForm && (
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--iv-border)", backgroundColor: "var(--iv-surface)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--iv-text)" }}>New Project Intake</h3>
            <button onClick={() => setShowForm(false)}><X size={14} style={{ color: "var(--iv-text-muted)" }} /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            {[
              { key: "clientName", label: "Client Name *", placeholder: "Arnarson Ventures", required: true },
              { key: "clientEmail", label: "Client Email", placeholder: "hello@client.com" },
              { key: "title", label: "Project Title *", placeholder: "AI Financial Dashboard", required: true },
              { key: "serviceType", label: "Service Type", placeholder: "Technical Build" },
              { key: "budget", label: "Budget", placeholder: "€12,000" },
            ].map(({ key, label, placeholder, required }) => (
              <div key={key}>
                <label className="block text-xs mb-1" style={{ color: "var(--iv-text-muted)" }}>{label}</label>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  required={required}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: "var(--iv-surface-2)", color: "var(--iv-text)", border: "1px solid var(--iv-border)" }}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--iv-text-muted)" }}>Priority</label>
              <select value={form.priority} onChange={e => setForm(prev => ({ ...prev, priority: e.target.value as typeof form.priority }))} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: "var(--iv-surface-2)", color: "var(--iv-text)", border: "1px solid var(--iv-border)" }}>
                {["low","medium","high","urgent"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs mb-1" style={{ color: "var(--iv-text-muted)" }}>Description</label>
              <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Project brief..." rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={{ backgroundColor: "var(--iv-surface-2)", color: "var(--iv-text)", border: "1px solid var(--iv-border)" }} />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--iv-surface-2)", color: "var(--iv-text-muted)", border: "1px solid var(--iv-border)" }}>Cancel</button>
              <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: "var(--iv-blue)", color: "var(--iv-navy)" }}>
                {createMutation.isPending ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 p-6 h-full min-w-max">
          {STATUS_COLS.map(col => {
            const colProjects = projects.filter((p: {status: string}) => p.status === col.key);
            return (
              <div key={col.key} className="w-72 shrink-0 flex flex-col" style={{ height: "calc(100% - 0px)" }}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: col.color }}>{col.label}</span>
                  <span className="ml-auto text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--iv-surface)", color: "var(--iv-text-muted)" }}>{colProjects.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {colProjects.map((p: {id: number; projectRef: string; clientName: string; title: string; serviceType: string|null; priority: string; budget: string|null; assignedAgent: string|null; status: "intake"|"scoping"|"active"|"review"|"delivered"|"archived"; createdAt: Date}) => (
                    <div key={p.id} className="iv-card p-3">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-mono" style={{ color: "var(--iv-blue)", fontSize: "10px" }}>{p.projectRef}</span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${PRIORITY_COLORS[p.priority]}18`, color: PRIORITY_COLORS[p.priority], fontSize: "10px" }}>{p.priority}</span>
                      </div>
                      <div className="text-sm font-semibold mb-1" style={{ color: "var(--iv-text)" }}>{p.title}</div>
                      <div className="text-xs mb-2" style={{ color: "var(--iv-text-muted)" }}>{p.clientName}</div>
                      {p.serviceType && <div className="text-xs mb-2" style={{ color: "var(--iv-text-muted)", fontSize: "10px" }}>{p.serviceType}</div>}
                      {p.budget && <div className="text-xs font-mono mb-2" style={{ color: "var(--iv-green)" }}>{p.budget}</div>}
                      {/* Status move */}
                      <div className="flex items-center gap-1 mt-2">
                        {STATUS_COLS.filter(s => s.key !== col.key).slice(0, 2).map(s => (
                          <button key={s.key} onClick={() => handleStatusUpdate(p.id, s.key)} className="text-xs px-2 py-0.5 rounded transition-colors" style={{ backgroundColor: "var(--iv-surface-2)", color: "var(--iv-text-muted)", border: "1px solid var(--iv-border)", fontSize: "10px" }}>
                            → {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {colProjects.length === 0 && (
                    <div className="flex items-center justify-center h-20 rounded-lg" style={{ border: "1px dashed var(--iv-border)" }}>
                      <span className="text-xs" style={{ color: "var(--iv-text-muted)", opacity: 0.5 }}>Empty</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

