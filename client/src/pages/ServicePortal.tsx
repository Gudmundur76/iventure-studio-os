import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STATUS_STEPS = ["new", "in_progress", "revision", "delivered"];

const STATUS_LABELS: Record<string, string> = {
  new: "Order Received",
  in_progress: "In Progress",
  revision: "Under Revision",
  delivered: "Delivered",
  closed: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  in_progress: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  revision: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  delivered: "bg-green-500/20 text-green-300 border-green-500/30",
  closed: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const PLAN_LABELS: Record<string, string> = {
  grunnur: "Grunnur (48h SLA)",
  voxtur: "Voxtur (24h SLA)",
  studio: "Studio (24h SLA)",
};

export default function ServicePortal() {
  const params = useParams<{ portalToken: string }>();
  const portalToken = params.portalToken;

  const { data: order, isLoading, error } = trpc.servicePortal.getOrder.useQuery(
    { portalToken: portalToken ?? "" },
    { enabled: !!portalToken }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading your order…</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-white mb-2">Order Not Found</h1>
          <p className="text-slate-400">
            This portal link is invalid or has expired. Please check your confirmation email for the correct link.
          </p>
          <a href="https://iventure.studio" className="mt-6 inline-block text-blue-400 hover:underline">
            Return to iVenture Studio
          </a>
        </div>
      </div>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(order.status);
  const slaMs = order.slaDeadline ? new Date(order.slaDeadline).getTime() - Date.now() : null;
  const slaHours = slaMs !== null ? Math.max(0, Math.floor(slaMs / 3600000)) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">iV</div>
            <span className="font-semibold text-white">iVenture Studio</span>
          </div>
          <a href="https://iventure.studio" className="text-sm text-slate-400 hover:text-white transition-colors">
            iventure.studio
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Order header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">Your Order</h1>
            <Badge className={`border ${STATUS_COLORS[order.status] ?? ""}`} variant="outline">
              {STATUS_LABELS[order.status] ?? order.status}
            </Badge>
          </div>
          <p className="text-slate-400">
            Hi {order.clientName} — here is the live status of your order.
          </p>
        </div>

        {/* Order details */}
        <Card className="bg-slate-800/60 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-200">{order.service}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Plan</span>
              <span className="text-white">{PLAN_LABELS[order.plan ?? ""] ?? order.plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ordered</span>
              <span className="text-white">{new Date(order.createdAt!).toLocaleDateString()}</span>
            </div>
            {slaHours !== null && order.status !== "delivered" && order.status !== "closed" && (
              <div className="flex justify-between">
                <span className="text-slate-400">SLA remaining</span>
                <span className={slaHours < 4 ? "text-red-400 font-medium" : "text-white"}>
                  {slaHours === 0 ? "Due now" : `${slaHours}h`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress tracker */}
        <Card className="bg-slate-800/60 border-slate-700">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                      i < currentStep ? "bg-green-600 border-green-600 text-white" :
                      i === currentStep ? "bg-blue-600 border-blue-600 text-white" :
                      "bg-slate-700 border-slate-600 text-slate-500"
                    }`}>
                      {i < currentStep ? "✓" : i + 1}
                    </div>
                    <span className={`text-xs mt-1 text-center max-w-[60px] leading-tight ${
                      i <= currentStep ? "text-slate-300" : "text-slate-600"
                    }`}>
                      {STATUS_LABELS[step]}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${i < currentStep ? "bg-green-600" : "bg-slate-700"}`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Delivery */}
        {order.status === "delivered" && order.deliveryUrl && (
          <Card className="bg-green-900/30 border-green-700/50">
            <CardContent className="py-6 text-center space-y-4">
              <div className="text-4xl">🎉</div>
              <h2 className="text-xl font-bold text-green-300">Your order is ready!</h2>
              {order.deliveryNote && (
                <p className="text-slate-300 text-sm">{order.deliveryNote}</p>
              )}
              <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                <a href={order.deliveryUrl} target="_blank" rel="noopener noreferrer">
                  Download / View Deliverable
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Support */}
        <div className="text-center text-sm text-slate-500 pt-4">
          Questions? Email{" "}
          <a href="mailto:hello@iventure.studio" className="text-blue-400 hover:underline">
            hello@iventure.studio
          </a>
        </div>
      </div>
    </div>
  );
}
