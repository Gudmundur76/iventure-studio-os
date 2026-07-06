import { trpc } from "@/lib/trpc";
import { Activity, Clock, Cpu, TrendingUp, Zap } from "lucide-react";
import IVPageHeader from "@/components/IVPageHeader";

const STATUS_CONFIG = {
  active: { label: "ACTIVE", className: "iv-badge-active" },
  idle: { label: "IDLE", className: "iv-badge-idle" },
  error: { label: "ERROR", className: "iv-badge-error" },
  offline: { label: "OFFLINE", className: "iv-badge-offline" },
};

const MODEL_COLORS: Record<string, string> = {
  "gpt-5": "#10b981",
  "claude-opus-4-5": "#8b5cf6",
  "claude-sonnet-4-5": "#6366f1",
  "gemini-2.5-pro": "#f59e0b",
  "deepseek-v3": "#ef4444",
};

export default function AgentBoard() {
  const { data: agents = [], isLoading } = trpc.agents.list.useQuery();

  const activeCount = agents.filter((a: {status: string}) => a.status === "active").length;
  const avgGrpo = agents.length > 0 ? (agents.reduce((s: number, a: {grpoScore: number}) => s + a.grpoScore, 0) / agents.length).toFixed(4) : "0.0000";
  const totalTasks = agents.reduce((s: number, a: {tasksCompleted: number}) => s + a.tasksCompleted, 0);

  return (
    <div className="flex flex-col h-full">
      <IVPageHeader
        title="VMOA Agent Board"
        subtitle="Multi-agent orchestration team — live status and routing"
        badge={`${agents.length} agents`}
      />

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 px-6 py-4" style={{ borderBottom: "1px solid var(--iv-border)" }}>
        {[
          { icon: Activity, label: "Active Agents", value: `${activeCount}/${agents.length}`, color: "var(--iv-green)" },
          { icon: TrendingUp, label: "Avg GRPO Score", value: avgGrpo, color: "var(--iv-blue)" },
          { icon: Zap, label: "Tasks Completed", value: totalTasks.toLocaleString(), color: "#f59e0b" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="iv-card px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: "var(--iv-text-muted)" }}>{label}</div>
              <div className="text-lg font-bold font-mono" style={{ color, lineHeight: 1.2 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Agent grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 13 }).map((_, i) => (
              <div key={i} className="iv-card p-4 animate-pulse" style={{ height: "160px" }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {agents.map((agent: {id: number; agentId: string; name: string; role: string; model: string; status: "active"|"idle"|"error"|"offline"; grpoScore: number; tasksCompleted: number; lastRun: Date|null; capabilities: string[]|null}) => {
              const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.idle;
              const modelColor = MODEL_COLORS[agent.model] ?? "var(--iv-blue)";
              const grpoPct = Math.round(agent.grpoScore * 100);
              return (
                <div key={agent.id} className="iv-card p-4 transition-all hover:iv-glow" style={{ cursor: "default" }}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${modelColor}18`, border: `1px solid ${modelColor}30` }}>
                        <Cpu size={14} style={{ color: modelColor }} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "var(--iv-text)", fontFamily: "'Syne', sans-serif" }}>{agent.name}</div>
                        <div className="text-xs font-mono" style={{ color: modelColor }}>{agent.model}</div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-mono ${statusCfg.className}`} style={{ fontSize: "10px" }}>
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Role */}
                  <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--iv-text-muted)" }}>{agent.role}</p>

                  {/* GRPO */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono" style={{ color: "var(--iv-text-muted)" }}>GRPO Score</span>
                      <span className="text-xs font-bold font-mono" style={{ color: "var(--iv-blue)" }}>{agent.grpoScore.toFixed(4)}</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--iv-border)" }}>
                      <div className="h-full grpo-bar transition-all" style={{ width: `${grpoPct}%` }} />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Zap size={11} style={{ color: "var(--iv-text-muted)" }} />
                      <span className="text-xs font-mono" style={{ color: "var(--iv-text-muted)" }}>{agent.tasksCompleted.toLocaleString()} tasks</span>
                    </div>
                    {agent.lastRun && (
                      <div className="flex items-center gap-1">
                        <Clock size={10} style={{ color: "var(--iv-text-muted)" }} />
                        <span className="text-xs" style={{ color: "var(--iv-text-muted)" }}>
                          {Math.round((Date.now() - new Date(agent.lastRun).getTime()) / 60000)}m ago
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Capabilities */}
                  {agent.capabilities && agent.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(agent.capabilities as string[]).slice(0, 3).map((cap: string) => (
                        <span key={cap} className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: "rgba(0,180,216,0.08)", color: "var(--iv-text-muted)", fontSize: "10px" }}>
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
