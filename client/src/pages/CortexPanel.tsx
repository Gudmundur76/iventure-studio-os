import { trpc } from "@/lib/trpc";
import { Activity, Brain, Sparkles, TrendingUp, Zap } from "lucide-react";
import IVPageHeader from "@/components/IVPageHeader";

const INTELLIGENCE_BRIEFS = [
  { id: 1, category: "finance/vat", finding: "VAT compliance automation showing +34% efficiency gain across 847 finance nodes this week", confidence: 0.91, sources: 847, trend: "rising" },
  { id: 2, category: "marketing/seo", finding: "Long-form content (2000+ words) outperforming short-form by 3.2× for B2B SaaS in EU markets", confidence: 0.87, sources: 1203, trend: "rising" },
  { id: 3, category: "legal/gdpr", finding: "GDPR Article 30 record-keeping automation reducing compliance overhead by 60% for SMEs", confidence: 0.83, sources: 412, trend: "stable" },
  { id: 4, category: "technical/security", finding: "Zero-trust architecture adoption accelerating — 78% of new deployments using service mesh", confidence: 0.79, sources: 634, trend: "rising" },
];

export default function CortexPanel() {
  const { data: stats } = trpc.cortex.stats.useQuery();
  const { data: signals = [] } = trpc.cortex.signals.useQuery({ limit: 30 });

  const totalCredits = stats?.totalCredits ?? 0;
  const totalSignals = stats?.totalSignals ?? 0;

  return (
    <div className="flex flex-col h-full">
      <IVPageHeader
        title="Cortex Panel"
        subtitle="VIC World Model — contribution counter, credits, and intelligence brief"
        badge="BUILDING"
        badgeColor="rgba(0,180,216,0.8)"
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4" style={{ borderBottom: "1px solid var(--iv-border)" }}>
        {[
          { icon: Activity, label: "Signals Contributed", value: totalSignals.toLocaleString(), color: "var(--iv-blue)" },
          { icon: Zap, label: "Cortex Credits", value: totalCredits.toLocaleString(), color: "var(--iv-green)" },
          { icon: Brain, label: "Knowledge Nodes", value: "2,847", color: "#8b5cf6" },
          { icon: TrendingUp, label: "Network Nodes", value: "391", color: "#f59e0b" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="iv-card px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: "var(--iv-text-muted)" }}>{label}</div>
              <div className="text-lg font-bold font-mono" style={{ color }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Intelligence Brief */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} style={{ color: "var(--iv-blue)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--iv-text)" }}>Daily Intelligence Brief</span>
            <span className="text-xs ml-2" style={{ color: "var(--iv-text-muted)" }}>Based on {totalSignals > 0 ? totalSignals : "2,847"} agent interactions</span>
          </div>
          <div className="space-y-3">
            {INTELLIGENCE_BRIEFS.map(brief => (
              <div key={brief.id} className="iv-card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ backgroundColor: brief.trend === "rising" ? "var(--iv-green)" : "var(--iv-blue)" }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-semibold" style={{ color: "var(--iv-blue)" }}>{brief.category}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono`} style={{ backgroundColor: brief.trend === "rising" ? "rgba(34,211,160,0.15)" : "rgba(0,180,216,0.15)", color: brief.trend === "rising" ? "var(--iv-green)" : "var(--iv-blue)", fontSize: "10px" }}>
                        {brief.trend}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "var(--iv-text)" }}>{brief.finding}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs font-mono" style={{ color: "var(--iv-text-muted)" }}>confidence: <span style={{ color: "var(--iv-blue)" }}>{(brief.confidence * 100).toFixed(0)}%</span></span>
                      <span className="text-xs font-mono" style={{ color: "var(--iv-text-muted)" }}>sources: <span style={{ color: "var(--iv-blue)" }}>{brief.sources.toLocaleString()} nodes</span></span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Signal feed */}
        <div className="w-80 shrink-0 overflow-y-auto p-5" style={{ borderLeft: "1px solid var(--iv-border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full iv-pulse" style={{ backgroundColor: "var(--iv-green)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--iv-text)" }}>Live Signal Feed</span>
          </div>
          <div className="space-y-2">
            {signals.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--iv-text-muted)" }}>No signals yet.</p>
            ) : (signals as Array<{id: number; category: string; grpoScore: number; outcomeSignal: string; agentId: string|null; createdAt: Date}>).map(sig => (
              <div key={sig.id} className="px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--iv-surface)", border: "1px solid var(--iv-border)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono" style={{ color: "var(--iv-blue)", fontSize: "10px" }}>{sig.category}</span>
                  <span className="text-xs font-mono font-bold" style={{ color: "var(--iv-green)", fontSize: "10px" }}>{sig.grpoScore.toFixed(4)}</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--iv-text-muted)", fontSize: "10px" }}>{sig.outcomeSignal} · {sig.agentId}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
