import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  in_progress: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  revision: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  delivered: "bg-green-500/20 text-green-300 border-green-500/30",
  closed: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const PLAN_LABELS: Record<string, string> = {
  grunnur: "Grunnur (48h)",
  voxtur: "Voxtur (24h)",
  studio: "Studio (24h)",
};

function slaCountdown(deadline: Date | null | undefined) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return { label: "OVERDUE", urgent: true };
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return { label: `${h}h ${m}m`, urgent: h < 4 };
}

export default function Orders() {
  const { data: orders = [], isLoading, error, refetch } = trpc.orders.list.useQuery();

  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("Status updated"); setStatusDialog(null); },
    onError: (e) => toast.error("Update failed: " + e.message),
  });
  const deliver = trpc.orders.deliver.useMutation({
    onSuccess: () => { refetch(); toast.success("Order delivered!"); setDeliverDialog(null); },
    onError: (e) => toast.error("Delivery failed: " + e.message),
  });

  const [deliverDialog, setDeliverDialog] = useState<{ id: number; clientName: string } | null>(null);
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [statusDialog, setStatusDialog] = useState<{ id: number; status: string } | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-400 text-sm">
        Failed to load orders: {error.message}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pantanir</h1>
          <p className="text-slate-400 text-sm mt-1">Service order pipeline — intake to delivery</p>
        </div>
        <Badge variant="outline" className="text-slate-300 border-slate-600">
          {orders.length} orders
        </Badge>
      </div>

      {orders.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-16 text-center text-slate-500">
            No orders yet. Orders submitted via the intake form will appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const sla = slaCountdown(order.slaDeadline);
            return (
              <Card key={order.id} className="bg-slate-800/60 border-slate-700 hover:border-slate-500 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{order.clientName}</span>
                        <span className="text-slate-400 text-sm">{order.clientEmail}</span>
                        <Badge className={`text-xs border ${STATUS_COLORS[order.status] ?? ""}`} variant="outline">
                          {order.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                          {PLAN_LABELS[order.plan ?? ""] ?? order.plan}
                        </Badge>
                        {sla && (
                          <span className={`text-xs font-mono ${sla.urgent ? "text-red-400" : "text-slate-400"}`}>
                            SLA: {sla.label}
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-300 font-medium">{order.service}</span>
                      </div>
                      <p className="text-slate-400 text-sm mt-1 line-clamp-2">{order.description}</p>
                      {order.deliveryUrl && (
                        <a href={order.deliveryUrl} target="_blank" rel="noopener noreferrer"
                          className="text-blue-400 text-sm hover:underline mt-1 block">
                          Delivery: {order.deliveryUrl}
                        </a>
                      )}
                      <div className="text-slate-500 text-xs mt-2">
                        Portal: <code className="text-slate-400">/portal/{order.portalToken?.slice(0, 12)}…</code>
                        {" · "}
                        {new Date(order.createdAt!).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button size="sm" variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        onClick={() => { setStatusDialog({ id: order.id, status: order.status }); setNewStatus(order.status); setInternalNotes(""); }}>
                        Update
                      </Button>
                      {order.status !== "delivered" && order.status !== "closed" && (
                        <Button size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => { setDeliverDialog({ id: order.id, clientName: order.clientName }); setDeliveryUrl(""); setDeliveryNote(""); }}>
                          Deliver
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Deliver Dialog */}
      <Dialog open={!!deliverDialog} onOpenChange={() => setDeliverDialog(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Deliver Order — {deliverDialog?.clientName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Delivery URL *</label>
              <Input value={deliveryUrl} onChange={e => setDeliveryUrl(e.target.value)}
                placeholder="https://drive.google.com/..." className="bg-slate-800 border-slate-600 text-white" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Note to client</label>
              <Textarea value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)}
                placeholder="Your deliverable is ready. Here's what was done..." rows={3}
                className="bg-slate-800 border-slate-600 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliverDialog(null)} className="border-slate-600">Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700"
              disabled={!deliveryUrl || deliver.isPending}
              onClick={() => deliverDialog && deliver.mutate({ id: deliverDialog.id, deliveryUrl, deliveryNote })}>
              {deliver.isPending ? "Delivering…" : "Mark Delivered"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={!!statusDialog} onOpenChange={() => setStatusDialog(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">New Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {["new", "in_progress", "revision", "delivered", "closed"].map(s => (
                    <SelectItem key={s} value={s} className="text-white">{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Internal Notes</label>
              <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)}
                placeholder="Internal notes (not visible to client)..." rows={2}
                className="bg-slate-800 border-slate-600 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(null)} className="border-slate-600">Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700"
              disabled={updateStatus.isPending}
              onClick={() => statusDialog && updateStatus.mutate({ id: statusDialog.id, status: newStatus, internalNotes: internalNotes || undefined })}>
              {updateStatus.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
