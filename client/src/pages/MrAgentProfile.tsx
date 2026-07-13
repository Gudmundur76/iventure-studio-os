import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bot, Plus, Pencil, Trash2, Star, Eye } from "lucide-react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────
interface Profile {
  id: number;
  name: string;
  tenantRef: string | null;
  persona: string;
  doctrine: string;
  workingStyle: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── System prompt preview ──────────────────────────────────────────────────
function buildPreview(persona: string, doctrine: string, workingStyle: string): string {
  return `${persona || "[persona not set]"}

DOCTRINE:
${doctrine || "[doctrine not set]"}

WORKING STYLE:
${workingStyle || "[working style not set]"}

CLIENT MEMORY CONTEXT:
[injected at runtime from memory_entries]

AVAILABLE AGENTS:
[injected at runtime from agents table]`;
}

// ── Profile form dialog ────────────────────────────────────────────────────
function ProfileDialog({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Profile | null;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [tenantRef, setTenantRef] = useState(initial?.tenantRef ?? "");
  const [persona, setPersona] = useState(initial?.persona ?? "");
  const [doctrine, setDoctrine] = useState(initial?.doctrine ?? "");
  const [workingStyle, setWorkingStyle] = useState(initial?.workingStyle ?? "");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [showPreview, setShowPreview] = useState(false);

  const preview = useMemo(
    () => buildPreview(persona, doctrine, workingStyle),
    [persona, doctrine, workingStyle]
  );

  const createMut = trpc.metaAgent.profiles.create.useMutation({
    onSuccess: () => {
      utils.metaAgent.profiles.list.invalidate();
      toast.success("Profile created");
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.metaAgent.profiles.update.useMutation({
    onSuccess: () => {
      utils.metaAgent.profiles.list.invalidate();
      toast.success("Profile updated");
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!name.trim() || !persona.trim() || !doctrine.trim() || !workingStyle.trim()) {
      toast.error("All fields are required");
      return;
    }
    if (isEdit && initial) {
      updateMut.mutate({
        id: initial.id,
        name: name.trim(),
        tenantRef: tenantRef.trim() || null,
        persona: persona.trim(),
        doctrine: doctrine.trim(),
        workingStyle: workingStyle.trim(),
        isDefault,
      });
    } else {
      createMut.mutate({
        name: name.trim(),
        tenantRef: tenantRef.trim() || undefined,
        persona: persona.trim(),
        doctrine: doctrine.trim(),
        workingStyle: workingStyle.trim(),
        isDefault,
      });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Bot className="w-5 h-5 text-violet-400" />
            {isEdit ? "Edit Profile" : "New Mr. Agent Profile"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Profile Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mr. Agent — Default"
                className="bg-zinc-900 border-zinc-700 text-zinc-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Tenant Ref (optional)</Label>
              <Input
                value={tenantRef}
                onChange={(e) => setTenantRef(e.target.value)}
                placeholder="tenant-abc123 or leave blank for global"
                className="bg-zinc-900 border-zinc-700 text-zinc-200"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Persona</Label>
            <Textarea
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              placeholder="Describe Mr. Agent's tone, style, and how it introduces itself…"
              className="min-h-[80px] bg-zinc-900 border-zinc-700 text-zinc-200 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Doctrine</Label>
            <Textarea
              value={doctrine}
              onChange={(e) => setDoctrine(e.target.value)}
              placeholder="Task decomposition rules, escalation rules, when to ask vs. proceed…"
              className="min-h-[80px] bg-zinc-900 border-zinc-700 text-zinc-200 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Working Style</Label>
            <Textarea
              value={workingStyle}
              onChange={(e) => setWorkingStyle(e.target.value)}
              placeholder="Formatting preferences, verbosity, language defaults…"
              className="min-h-[80px] bg-zinc-900 border-zinc-700 text-zinc-200 resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={isDefault}
                onCheckedChange={setIsDefault}
                id="isDefault"
              />
              <Label htmlFor="isDefault" className="text-zinc-400 text-sm cursor-pointer">
                Set as default profile
              </Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview((p) => !p)}
              className="text-zinc-400 hover:text-zinc-200 gap-1.5"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? "Hide" : "Preview"} system prompt
            </Button>
          </div>

          {showPreview && (
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
              <p className="text-xs text-zinc-500 mb-2 font-mono">SYSTEM PROMPT PREVIEW</p>
              <ScrollArea className="max-h-[200px]">
                <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed">
                  {preview}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending} className="text-zinc-400">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="bg-violet-600 hover:bg-violet-500 text-white"
          >
            {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Profile card ───────────────────────────────────────────────────────────
function ProfileCard({
  profile,
  onEdit,
  onDelete,
}: {
  profile: Profile;
  onEdit: (p: Profile) => void;
  onDelete: (p: Profile) => void;
}) {
  return (
    <Card className="bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-sm font-medium text-white">{profile.name}</CardTitle>
            {profile.isDefault && (
              <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs gap-1">
                <Star className="w-3 h-3" /> Default
              </Badge>
            )}
            {profile.tenantRef && (
              <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">
                {profile.tenantRef}
              </Badge>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-zinc-500 hover:text-zinc-200"
              onClick={() => onEdit(profile)}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-zinc-500 hover:text-red-400"
              onClick={() => onDelete(profile)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">Persona</p>
          <p className="text-sm text-zinc-400 line-clamp-2">{profile.persona}</p>
        </div>
        <Separator className="bg-zinc-800" />
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">Doctrine</p>
          <p className="text-sm text-zinc-400 line-clamp-2">{profile.doctrine}</p>
        </div>
        <Separator className="bg-zinc-800" />
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">Working Style</p>
          <p className="text-sm text-zinc-400 line-clamp-2">{profile.workingStyle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function MrAgentProfile() {
  const utils = trpc.useUtils();
  const { data: profiles = [], isLoading } = trpc.metaAgent.profiles.list.useQuery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

  const deleteMut = trpc.metaAgent.profiles.delete.useMutation({
    onSuccess: () => {
      utils.metaAgent.profiles.list.invalidate();
      toast.success("Profile deleted");
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleEdit = (p: Profile) => {
    setEditTarget(p);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Mr. Agent Profiles</h1>
            <p className="text-sm text-zinc-500">Persona, doctrine, and working style for the meta-agent</p>
          </div>
        </div>
        <Button
          onClick={handleNew}
          className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          New Profile
        </Button>
      </div>

      {/* Profile list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 rounded-lg bg-zinc-900/50 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Bot className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No profiles yet. Create one to configure Mr. Agent's personality.</p>
            <Button onClick={handleNew} variant="outline" className="mt-4 border-zinc-700 text-zinc-300 gap-2">
              <Plus className="w-4 h-4" />
              Create Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(profiles as Profile[]).map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <ProfileDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        initial={editTarget}
        onSaved={() => utils.metaAgent.profiles.list.invalidate()}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Profile</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete <strong className="text-zinc-200">{deleteTarget?.name}</strong>?
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate({ id: deleteTarget.id })}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
