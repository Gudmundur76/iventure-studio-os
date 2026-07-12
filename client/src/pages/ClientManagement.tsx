import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, Plus, ExternalLink, Copy, Mail, Globe, Trash2, Edit2, CheckCircle, Clock, PauseCircle, XCircle, Inbox, Zap } from "lucide-react";

const STATUS_CONFIG = {
  active:     { label: "Active",     color: "bg-green-500/10 text-green-400 border-green-500/20",  icon: CheckCircle },
  onboarding: { label: "Onboarding", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",     icon: Clock },
  paused:     { label: "Paused",     color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: PauseCircle },
  churned:    { label: "Churned",    color: "bg-red-500/10 text-red-400 border-red-500/20",         icon: XCircle },
} as const;

const PLAN_COLORS: Record<string, string> = {
  starter:      "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  professional: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  enterprise:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

function ProvisionSubdomainButton({ subdomain }: { subdomain: string }) {
  const provisionMut = trpc.hostinger.provisionSubdomain.useMutation({
    onSuccess: (data) => toast.success(`Subdomain provisioned: ${data.fqdn}`),
    onError: (e) => toast.error(`Provision failed: ${e.message}`),
  });
  return (
    <div className="bg-[var(--iv-surface)] rounded-lg p-4 border border-[var(--iv-border)] col-span-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-[var(--iv-text-dim)] mb-1">DNS Provisioning</div>
          <div className="text-sm font-mono">{subdomain}.gummi.lt → 187.124.213.194</div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
          disabled={provisionMut.isPending}
          onClick={() => provisionMut.mutate({ subdomain })}
        >
          <Zap className="w-3 h-3 mr-1" />
          {provisionMut.isPending ? "Provisioning…" : provisionMut.isSuccess ? "Provisioned ✓" : "Provision DNS"}
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.onboarding;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

interface ClientFormData {
  name: string;
  email: string;
  company: string;
  phone: string;
  assignedAgentId: string;
  gmailLabel: string;
  emailAddress: string;
  subdomain: string;
  plan: string;
  notes: string;
}

const EMPTY_FORM: ClientFormData = {
  name: "", email: "", company: "", phone: "",
  assignedAgentId: "nanoclaw", gmailLabel: "", emailAddress: "",
  subdomain: "", plan: "starter", notes: "",
};

export default function ClientManagement() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientFormData>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const { data: clients = [], refetch } = trpc.clients.list.useQuery();
  const { data: tasks = [] } = trpc.clients.tasks.useQuery(
    { clientRef: selectedClient ?? undefined },
    { enabled: !!selectedClient }
  );
  const { data: agents = [] } = trpc.agents.list.useQuery();

  const createMut = trpc.clients.create.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); setForm(EMPTY_FORM); toast.success("Client created"); } });
  const updateMut = trpc.clients.update.useMutation({ onSuccess: () => { refetch(); setEditId(null); setForm(EMPTY_FORM); toast.success("Client updated"); } });
  const deleteMut = trpc.clients.delete.useMutation({ onSuccess: () => { refetch(); setSelectedClient(null); toast.success("Client removed"); } });
  const updateTaskMut = trpc.clients.updateTask.useMutation({ onSuccess: () => refetch() });

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.company ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const selectedClientData = clients.find(c => c.clientRef === selectedClient);

  function openEdit(c: typeof clients[0]) {
    setEditId(c.id);
    setForm({
      name: c.name, email: c.email, company: c.company ?? "",
      phone: c.phone ?? "", assignedAgentId: c.assignedAgentId,
      gmailLabel: c.gmailLabel ?? "", emailAddress: c.emailAddress ?? "",
      subdomain: c.subdomain ?? "", plan: c.plan, notes: c.notes ?? "",
    });
  }

  function copyPortalLink(token: string) {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Portal link copied");
  }

  const portalOrigin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="flex h-full">
      {/* Left: Client List */}
      <div className="w-72 border-r border-[var(--iv-border)] flex flex-col">
        <div className="p-4 border-b border-[var(--iv-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--iv-cyan)]" />
            <span className="font-semibold text-sm">Clients</span>
            <span className="text-xs text-[var(--iv-text-dim)] bg-[var(--iv-surface)] px-1.5 py-0.5 rounded">{clients.length}</span>
          </div>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setForm(EMPTY_FORM); setShowCreate(true); }}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-3 border-b border-[var(--iv-border)]">
          <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-[var(--iv-text-dim)] text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No clients yet
            </div>
          )}
          {filtered.map(c => (
            <button
              key={c.clientRef}
              onClick={() => setSelectedClient(c.clientRef)}
              className={`w-full text-left px-4 py-3 border-b border-[var(--iv-border)] hover:bg-[var(--iv-surface)] transition-colors ${selectedClient === c.clientRef ? "bg-[var(--iv-surface)] border-l-2 border-l-[var(--iv-cyan)]" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm truncate">{c.name}</span>
                <StatusBadge status={c.status as keyof typeof STATUS_CONFIG} />
              </div>
              <div className="text-xs text-[var(--iv-text-dim)] truncate">{c.company ?? c.email}</div>
              <div className="text-xs text-[var(--iv-text-dim)] mt-1">{c.assignedAgentId} · {c.plan}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Client Detail */}
      <div className="flex-1 overflow-y-auto">
        {!selectedClientData ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--iv-text-dim)]">
            <Users className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Select a client to view details</p>
            <Button className="mt-4" size="sm" onClick={() => { setForm(EMPTY_FORM); setShowCreate(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add First Client
            </Button>
          </div>
        ) : (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold font-[var(--iv-font-display)]">{selectedClientData.name}</h2>
                {selectedClientData.company && <p className="text-[var(--iv-text-dim)] text-sm">{selectedClientData.company}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={selectedClientData.status as keyof typeof STATUS_CONFIG} />
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PLAN_COLORS[selectedClientData.plan] ?? PLAN_COLORS.starter}`}>
                    {selectedClientData.plan}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(selectedClientData)}>
                  <Edit2 className="w-3 h-3 mr-1" /> Edit
                </Button>
                {selectedClientData.assignedAgentId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[var(--iv-cyan)] border-[var(--iv-cyan)]/30 hover:bg-[var(--iv-cyan)]/10"
                    onClick={() => navigate(`/os/email?agent=${encodeURIComponent(selectedClientData.assignedAgentId)}`)}
                  >
                    <Inbox className="w-3 h-3 mr-1" /> View Inbox
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-red-400 hover:text-red-300" onClick={() => deleteMut.mutate({ id: selectedClientData.id })}>
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[var(--iv-surface)] rounded-lg p-4 border border-[var(--iv-border)]">
                <div className="text-xs text-[var(--iv-text-dim)] mb-1">Email</div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3 text-[var(--iv-cyan)]" />
                  <span className="text-sm">{selectedClientData.email}</span>
                </div>
              </div>
              <div className="bg-[var(--iv-surface)] rounded-lg p-4 border border-[var(--iv-border)]">
                <div className="text-xs text-[var(--iv-text-dim)] mb-1">Assigned Agent</div>
                <div className="text-sm font-mono text-[var(--iv-cyan)]">{selectedClientData.assignedAgentId}</div>
              </div>
              {selectedClientData.gmailLabel && (
                <div className="bg-[var(--iv-surface)] rounded-lg p-4 border border-[var(--iv-border)]">
                  <div className="text-xs text-[var(--iv-text-dim)] mb-1">Gmail Label</div>
                  <div className="text-sm font-mono">{selectedClientData.gmailLabel}</div>
                </div>
              )}
              {selectedClientData.subdomain && (
              <div className="bg-[var(--iv-surface)] rounded-lg p-4 border border-[var(--iv-border)]">
                <div className="text-xs text-[var(--iv-text-dim)] mb-1">Subdomain</div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3 text-[var(--iv-cyan)]" />
                  <span className="text-sm">{selectedClientData.subdomain}.gummi.lt</span>
                </div>
              </div>
            )}
            {selectedClientData.subdomain && (
              <ProvisionSubdomainButton subdomain={selectedClientData.subdomain} />
            )}
            </div>

            {/* Portal Link */}
            <div className="bg-[var(--iv-surface)] rounded-lg p-4 border border-[var(--iv-border)] mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--iv-text-dim)] font-semibold uppercase tracking-wider">Client Portal Link</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copyPortalLink(selectedClientData.portalToken)}>
                    <Copy className="w-3 h-3 mr-1" /> Copy
                  </Button>
                  <a href={`/portal/${selectedClientData.portalToken}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="h-6 text-xs">
                      <ExternalLink className="w-3 h-3 mr-1" /> Open
                    </Button>
                  </a>
                </div>
              </div>
              <div className="font-mono text-xs text-[var(--iv-cyan)] bg-black/30 rounded px-3 py-2 break-all">
                {portalOrigin}/portal/{selectedClientData.portalToken}
              </div>
            </div>

            {/* Notes */}
            {selectedClientData.notes && (
              <div className="bg-[var(--iv-surface)] rounded-lg p-4 border border-[var(--iv-border)] mb-6">
                <div className="text-xs text-[var(--iv-text-dim)] mb-2 font-semibold uppercase tracking-wider">Notes</div>
                <p className="text-sm text-[var(--iv-text-dim)] whitespace-pre-wrap">{selectedClientData.notes}</p>
              </div>
            )}

            {/* Tasks */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                Tasks
                <span className="text-xs text-[var(--iv-text-dim)] bg-[var(--iv-surface)] px-1.5 py-0.5 rounded">{tasks.length}</span>
              </h3>
              {tasks.length === 0 ? (
                <div className="text-sm text-[var(--iv-text-dim)] text-center py-8 border border-dashed border-[var(--iv-border)] rounded-lg">
                  No tasks submitted yet
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map(t => (
                    <div key={t.id} className="bg-[var(--iv-surface)] rounded-lg p-4 border border-[var(--iv-border)]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{t.title}</div>
                          <div className="text-xs text-[var(--iv-text-dim)] mt-1 line-clamp-2">{t.description}</div>
                          {t.agentReply && (
                            <div className="mt-2 text-xs bg-cyan-500/5 border border-cyan-500/20 rounded p-2 text-cyan-300">
                              <span className="font-semibold">Agent: </span>{t.agentReply}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            t.status === "done" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                            t.status === "in_progress" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" :
                            t.status === "cancelled" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                          }`}>{t.status.replace("_", " ")}</span>
                          {t.status === "submitted" && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs"
                              onClick={() => updateTaskMut.mutate({ id: t.id, status: "in_progress" })}>
                              Start
                            </Button>
                          )}
                          {t.status === "in_progress" && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-green-400"
                              onClick={() => updateTaskMut.mutate({ id: t.id, status: "done" })}>
                              Mark Done
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-[var(--iv-text-dim)] mt-2">
                        {new Date(t.submittedAt).toLocaleString()} · {t.priority}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate || editId !== null} onOpenChange={open => { if (!open) { setShowCreate(false); setEditId(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Client" : "Add New Client"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <label className="text-xs text-[var(--iv-text-dim)] mb-1 block">Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Client name" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-[var(--iv-text-dim)] mb-1 block">Email *</label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="client@example.com" />
            </div>
            <div>
              <label className="text-xs text-[var(--iv-text-dim)] mb-1 block">Company</label>
              <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company name" />
            </div>
            <div>
              <label className="text-xs text-[var(--iv-text-dim)] mb-1 block">Phone</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+354 xxx xxxx" />
            </div>
            <div>
              <label className="text-xs text-[var(--iv-text-dim)] mb-1 block">Assigned Agent</label>
              <Select value={form.assignedAgentId} onValueChange={v => setForm(f => ({ ...f, assignedAgentId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nanoclaw">NanoClaw</SelectItem>
                  {(agents as Array<{ agentId: string; name: string }>).map(a => (
                    <SelectItem key={a.agentId} value={a.agentId}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--iv-text-dim)] mb-1 block">Plan</label>
              <Select value={form.plan} onValueChange={v => setForm(f => ({ ...f, plan: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--iv-text-dim)] mb-1 block">Gmail Label</label>
              <Input value={form.gmailLabel} onChange={e => setForm(f => ({ ...f, gmailLabel: e.target.value }))} placeholder="client/acme" />
            </div>
            <div>
              <label className="text-xs text-[var(--iv-text-dim)] mb-1 block">Subdomain</label>
              <Input value={form.subdomain} onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))} placeholder="acme" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-[var(--iv-text-dim)] mb-1 block">Notes</label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditId(null); setForm(EMPTY_FORM); }}>Cancel</Button>
            <Button
              disabled={!form.name || !form.email || createMut.isPending || updateMut.isPending}
              onClick={() => {
                if (editId) {
                  updateMut.mutate({ id: editId, ...form });
                } else {
                  createMut.mutate(form);
                }
              }}
            >
              {editId ? "Save Changes" : "Create Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
