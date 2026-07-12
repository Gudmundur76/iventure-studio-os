import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Building2, Plus, Pencil, Trash2, Users, UserPlus } from "lucide-react";

// Astryx components
import { Table, proportional, pixel, type TableColumn } from "@astryxdesign/core/Table";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { HStack } from "@astryxdesign/core/HStack";
import { VStack } from "@astryxdesign/core/VStack";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Selector } from "@astryxdesign/core/Selector";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";

// ── Types ──────────────────────────────────────────────────────────────────
interface TenantRow extends Record<string, unknown> {
  id: number;
  tenantRef: string;
  name: string;
  plan: string;
  status: "active" | "suspended" | "trial";
  workerQuota: number;
  defaultAgentId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ClientRow extends Record<string, unknown> {
  id: number;
  clientRef: string;
  tenantRef: string | null;
  name: string;
  email: string;
  company: string | null;
  status: string;
}

// ── Badge colour helpers ────────────────────────────────────────────────────
type BadgeVariant = "neutral" | "blue" | "green" | "purple" | "red" | "yellow";

const PLAN_BADGE: Record<string, BadgeVariant> = {
  starter: "neutral",
  growth: "blue",
  enterprise: "purple",
};

const STATUS_BADGE: Record<string, BadgeVariant> = {
  active: "green",
  trial: "yellow",
  suspended: "red",
};

// ── Form state ──────────────────────────────────────────────────────────────
interface TenantForm {
  name: string;
  plan: string;
  status: "active" | "suspended" | "trial";
  workerQuota: number | null | undefined;
}

const DEFAULT_FORM: TenantForm = {
  name: "",
  plan: "starter",
  status: "trial",
  workerQuota: 10,
};

const PLAN_OPTIONS = [
  { value: "starter", label: "Starter" },
  { value: "growth", label: "Growth" },
  { value: "enterprise", label: "Enterprise" },
];

const STATUS_OPTIONS = [
  { value: "trial", label: "Trial" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

// ── Main page ───────────────────────────────────────────────────────────────
export default function TenantManagement() {
  const utils = trpc.useUtils();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: rawTenants = [], isLoading } = trpc.tenants.list.useQuery();
  const tenants = rawTenants as TenantRow[];

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<TenantRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TenantRow | null>(null);
  const [assignTarget, setAssignTarget] = useState<TenantRow | null>(null);
  const [assignSelected, setAssignSelected] = useState<string[]>([]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState<TenantForm>(DEFAULT_FORM);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMut = trpc.tenants.create.useMutation({
    onMutate: async (input) => {
      await utils.tenants.list.cancel();
      const prev = utils.tenants.list.getData();
      utils.tenants.list.setData(undefined, (old = []) => [
        ...old,
        {
          id: -Date.now(),
          tenantRef: "pending-" + Date.now(),
          name: input.name,
          plan: input.plan ?? "starter",
          status: "trial" as const,
          workerQuota: input.workerQuota ?? 10,
          defaultAgentId: "nanoclaw",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.tenants.list.setData(undefined, ctx.prev);
      toast.error("Failed to create tenant");
    },
    onSuccess: () => {
      utils.tenants.list.invalidate();
      setCreateOpen(false);
      setForm(DEFAULT_FORM);
      toast.success("Tenant created");
    },
  });

  const updateMut = trpc.tenants.update.useMutation({
    onMutate: async (input) => {
      await utils.tenants.list.cancel();
      const prev = utils.tenants.list.getData();
      utils.tenants.list.setData(undefined, (old = []) =>
        old.map((t) =>
          t.id === input.id
            ? {
                ...t,
                name: input.name ?? t.name,
                plan: input.plan ?? t.plan,
                status: input.status ?? t.status,
                workerQuota: input.workerQuota ?? t.workerQuota,
              }
            : t
        )
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.tenants.list.setData(undefined, ctx.prev);
      toast.error("Failed to update tenant");
    },
    onSuccess: () => {
      utils.tenants.list.invalidate();
      setEditTenant(null);
      setForm(DEFAULT_FORM);
      toast.success("Tenant updated");
    },
  });

  // ── Assign Clients ────────────────────────────────────────────────────────
  const { data: rawClients = [] } = trpc.clients.list.useQuery();
  const allClients = rawClients as ClientRow[];
  const clientOptions = allClients.map((c) => ({
    value: String(c.id),
    label: c.company ? `${c.name} (${c.company})` : c.name,
  }));
  const setClientsMut = trpc.tenants.setClients.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate();
      utils.clients.list.invalidate();
      setAssignTarget(null);
      setAssignSelected([]);
      toast.success("Clients updated");
    },
    onError: () => toast.error("Failed to update clients"),
  });
  function openAssignDialog(tenant: TenantRow) {
    const preSelected = allClients
      .filter((c) => c.tenantRef === tenant.tenantRef)
      .map((c) => String(c.id));
    setAssignSelected(preSelected);
    setAssignTarget(tenant);
  }
  function handleAssign() {
    if (!assignTarget) return;
    setClientsMut.mutate({
      tenantRef: assignTarget.tenantRef,
      clientIds: assignSelected.map(Number),
    });
  }

  const deleteMut = trpc.tenants.delete.useMutation({
    onMutate: async (input) => {
      await utils.tenants.list.cancel();
      const prev = utils.tenants.list.getData();
      utils.tenants.list.setData(undefined, (old = []) =>
        old.filter((t) => t.id !== input.id)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.tenants.list.setData(undefined, ctx.prev);
      toast.error("Failed to delete tenant");
    },
    onSuccess: () => {
      utils.tenants.list.invalidate();
      setDeleteTarget(null);
      toast.success("Tenant deleted");
    },
  });

  // ── KPI counts ────────────────────────────────────────────────────────────
  const total = tenants.length;
  const active = tenants.filter((t) => t.status === "active").length;
  const trial = tenants.filter((t) => t.status === "trial").length;
  const suspended = tenants.filter((t) => t.status === "suspended").length;

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns: TableColumn<TenantRow>[] = [
    {
      key: "name",
      header: "Tenant",
      width: proportional(3),
      renderCell: (t) => (
        <VStack gap={0}>
          <Text type="body" weight="semibold">{t.name}</Text>
          <Text type="supporting" color="secondary">{t.tenantRef}</Text>
        </VStack>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      width: proportional(1),
      renderCell: (t) => (
        <Badge
          label={t.plan.charAt(0).toUpperCase() + t.plan.slice(1)}
          variant={PLAN_BADGE[t.plan] ?? "neutral"}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      width: proportional(1),
      renderCell: (t) => (
        <Badge
          label={t.status.charAt(0).toUpperCase() + t.status.slice(1)}
          variant={STATUS_BADGE[t.status] ?? "neutral"}
        />
      ),
    },
    {
      key: "workerQuota",
      header: "Quota",
      width: pixel(80),
      align: "center",
      renderCell: (t) => (
        <Text type="body" color="secondary">{String(t.workerQuota)}</Text>
      ),
    },
    {
      key: "defaultAgentId",
      header: "Default Agent",
      width: proportional(2),
      renderCell: (t) => (
        <Text type="body" color="secondary">{String(t.defaultAgentId)}</Text>
      ),
    },
    {
      key: "id",
      header: "",
      width: pixel(145),
      align: "end",
      renderCell: (t) => (
        <HStack gap={1} vAlign="center">
          <Button
            label="Edit tenant"
            variant="ghost"
            size="sm"
            icon={<Pencil size={14} />}
            isIconOnly
            onClick={() => {
              setEditTenant(t);
              setForm({
                name: t.name,
                plan: t.plan,
                status: t.status,
                workerQuota: t.workerQuota,
              });
            }}
          />
          <Button
            label="Assign clients"
            variant="ghost"
            size="sm"
            icon={<UserPlus size={14} />}
            isIconOnly
            onClick={() => openAssignDialog(t)}
          />
          <Button
            label="Delete tenant"
            variant="destructive"
            size="sm"
            icon={<Trash2 size={14} />}
            isIconOnly
            onClick={() => setDeleteTarget(t)}
          />
        </HStack>
      ),
    },
  ];

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleCreate() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    createMut.mutate({
      name: form.name.trim(),
      plan: form.plan,
      workerQuota: form.workerQuota ?? 10,
    });
  }

  function handleUpdate() {
    if (!editTenant) return;
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    updateMut.mutate({
      id: editTenant.id,
      name: form.name.trim(),
      plan: form.plan,
      status: form.status,
      workerQuota: form.workerQuota ?? 10,
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
      {/* ── Page header ── */}
      <HStack hAlign="between" vAlign="center" style={{ marginBottom: "1.5rem" }}>
        <HStack gap={3} vAlign="center">
          <Building2 size={24} />
          <VStack gap={0}>
            <Heading level={2}>Tenant Management</Heading>
            <Text type="supporting" color="secondary">
              Manage workspace tenants and their resource quotas
            </Text>
          </VStack>
        </HStack>
        <Button
          label="New Tenant"
          variant="primary"
          size="md"
          icon={<Plus size={16} />}
          onClick={() => {
            setForm(DEFAULT_FORM);
            setCreateOpen(true);
          }}
        />
      </HStack>

      {/* ── KPI cards ── */}
      <Grid columns={4} gap={4} style={{ marginBottom: "1.5rem" }}>
        <KpiCard label="Total Tenants" value={total} icon={<Building2 size={20} />} />
        <KpiCard label="Active" value={active} icon={<Users size={20} />} accent="green" />
        <KpiCard label="Trial" value={trial} icon={<Users size={20} />} accent="yellow" />
        <KpiCard label="Suspended" value={suspended} icon={<Users size={20} />} accent="red" />
      </Grid>

      {/* ── Tenants table ── */}
      <Card padding={4}>
        {isLoading ? (
          <VStack hAlign="center" style={{ padding: "3rem 0" }}>
            <Text type="body" color="secondary">Loading tenants…</Text>
          </VStack>
        ) : tenants.length === 0 ? (
          <VStack hAlign="center" style={{ padding: "3rem 0" }}>
            <Building2 size={40} />
            <Text type="body" color="secondary" style={{ marginTop: "0.75rem" }}>
              No tenants yet. Create your first tenant to get started.
            </Text>
          </VStack>
        ) : (
          <Table<TenantRow>
            data={tenants}
            columns={columns}
            idKey="id"
            dividers="rows"
            hasHover
            density="balanced"
          />
        )}
      </Card>

      {/* ── Create dialog ── */}
      <Dialog
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        purpose="form"
        width={480}
      >
        <Layout
          header={
            <DialogHeader
              title="New Tenant"
              onOpenChange={setCreateOpen}
            />
          }
          content={
            <LayoutContent>
              <TenantFormFields form={form} setForm={setForm} mode="create" />
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack hAlign="end" gap={2}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  size="md"
                  onClick={() => setCreateOpen(false)}
                />
                <Button
                  label={createMut.isPending ? "Creating…" : "Create Tenant"}
                  variant="primary"
                  size="md"
                  isDisabled={!form.name.trim() || createMut.isPending}
                  isLoading={createMut.isPending}
                  onClick={handleCreate}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog
        isOpen={!!editTenant}
        onOpenChange={(open) => { if (!open) setEditTenant(null); }}
        purpose="form"
        width={480}
      >
        <Layout
          header={
            <DialogHeader
              title={`Edit — ${editTenant?.name ?? ""}`}
              onOpenChange={(open) => { if (!open) setEditTenant(null); }}
            />
          }
          content={
            <LayoutContent>
              <TenantFormFields form={form} setForm={setForm} mode="edit" />
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack hAlign="end" gap={2}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  size="md"
                  onClick={() => setEditTenant(null)}
                />
                <Button
                  label={updateMut.isPending ? "Saving…" : "Save Changes"}
                  variant="primary"
                  size="md"
                  isDisabled={!form.name.trim() || updateMut.isPending}
                  isLoading={updateMut.isPending}
                  onClick={handleUpdate}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>

      {/* ── Delete confirm dialog ── */}
      {/* ── Assign Clients dialog ── */}
      <Dialog
        isOpen={!!assignTarget}
        onOpenChange={(open) => { if (!open) { setAssignTarget(null); setAssignSelected([]); } }}
        purpose="form"
        width={520}
      >
        <Layout
          header={
            <DialogHeader
              title={`Assign Clients — ${assignTarget?.name ?? ""}`}
              onOpenChange={(open) => { if (!open) { setAssignTarget(null); setAssignSelected([]); } }}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={3}>
                <Text type="supporting" color="secondary">
                  Select which clients belong to this tenant. Clients not in this selection will be
                  unlinked from the tenant.
                </Text>
                <MultiSelector
                  label="Clients"
                  options={clientOptions}
                  value={assignSelected}
                  onChange={setAssignSelected}
                  placeholder="Search clients…"
                  hasSearch
                  hasSelectAll
                  hasClear
                  triggerDisplay="badges"
                  width="100%"
                />
                {assignSelected.length > 0 && (
                  <Text type="supporting" color="secondary">
                    {assignSelected.length} client{assignSelected.length !== 1 ? "s" : ""} selected
                  </Text>
                )}
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack hAlign="end" gap={2}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  size="md"
                  onClick={() => { setAssignTarget(null); setAssignSelected([]); }}
                />
                <Button
                  label={setClientsMut.isPending ? "Saving…" : "Save Assignments"}
                  variant="primary"
                  size="md"
                  isLoading={setClientsMut.isPending}
                  isDisabled={setClientsMut.isPending}
                  onClick={handleAssign}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
      <Dialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        purpose="form"
        width={400}
      >
        <Layout
          header={
            <DialogHeader
              title="Delete Tenant"
              onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
            />
          }
          content={
            <LayoutContent>
              <Text type="body">
                Are you sure you want to delete{" "}
                <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
              </Text>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack hAlign="end" gap={2}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  size="md"
                  onClick={() => setDeleteTarget(null)}
                />
                <Button
                  label={deleteMut.isPending ? "Deleting…" : "Delete"}
                  variant="destructive"
                  size="md"
                  isDisabled={deleteMut.isPending}
                  isLoading={deleteMut.isPending}
                  onClick={() => deleteTarget && deleteMut.mutate({ id: deleteTarget.id })}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Dialog>
    </div>
  );
}

// ── KPI card sub-component ──────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: "green" | "yellow" | "red";
}) {
  const accentColor =
    accent === "green"
      ? "#22c55e"
      : accent === "yellow"
      ? "#eab308"
      : accent === "red"
      ? "#ef4444"
      : undefined;

  return (
    <Card padding={4}>
      <VStack gap={2}>
        <HStack hAlign="between" vAlign="center">
          <Text type="supporting" color="secondary">{label}</Text>
          <span style={{ color: accentColor }}>{icon}</span>
        </HStack>
        <Text type="body" weight="bold" style={{ fontSize: "2rem", lineHeight: "1" }}>
          {String(value)}
        </Text>
      </VStack>
    </Card>
  );
}

// ── Tenant form fields sub-component ───────────────────────────────────────
function TenantFormFields({
  form,
  setForm,
  mode,
}: {
  form: TenantForm;
  setForm: React.Dispatch<React.SetStateAction<TenantForm>>;
  mode: "create" | "edit";
}) {
  return (
    <VStack gap={4}>
      <TextInput
        label="Tenant Name"
        value={form.name}
        onChange={(v) => setForm((f) => ({ ...f, name: v }))}
        placeholder="Acme Corp"
        isRequired
        width="100%"
      />
      <Selector
        label="Plan"
        options={PLAN_OPTIONS}
        value={form.plan}
        onChange={(v) => setForm((f) => ({ ...f, plan: v }))}
        width="100%"
      />
      {mode === "edit" && (
        <Selector
          label="Status"
          options={STATUS_OPTIONS}
          value={form.status}
          onChange={(v) =>
            setForm((f) => ({
              ...f,
              status: v as "active" | "suspended" | "trial",
            }))
          }
          width="100%"
        />
      )}
      <NumberInput
        label="Worker Quota"
        value={form.workerQuota}
        onChange={(v) => setForm((f) => ({ ...f, workerQuota: v }))}
        min={1}
        max={100}
        isIntegerOnly
        width="100%"
      />
    </VStack>
  );
}
