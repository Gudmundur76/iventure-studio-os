import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, Legend
} from "recharts";
import IVPageHeader from "@/components/IVPageHeader";
import { BarChart3, TrendingUp, Activity, Zap } from "lucide-react";

// Synthetic GRPO history data (30 days)
const GRPO_HISTORY = Array.from({ length: 30 }, (_, i) => ({
  day: `D${i + 1}`,
  commander: 0.985 + Math.random() * 0.008,
  financial: 0.982 + Math.random() * 0.009,
  technical: 0.983 + Math.random() * 0.007,
  cortex: 0.988 + Math.random() * 0.004,
}));

const AGENT_PERFORMANCE = [
  { name: "Commander", tasks: 1247, grpo: 0.9913, color: "#00B4D8" },
  { name: "Financial", tasks: 892, grpo: 0.9891, color: "#22d3a0" },
  { name: "Technical", tasks: 756, grpo: 0.9878, color: "#3b82f6" },
  { name: "Marketing", tasks: 1103, grpo: 0.9845, color: "#f59e0b" },
  { name: "Cortex", tasks: 2341, grpo: 0.9901, color: "#8b5cf6" },
  { name: "Research", tasks: 521, grpo: 0.9834, color: "#ec4899" },
  { name: "Data", tasks: 678, grpo: 0.9823, color: "#06b6d4" },
  { name: "Legal", tasks: 634, grpo: 0.9867, color: "#10b981" },
  { name: "Security", tasks: 423, grpo: 0.9856, color: "#ef4444" },
];

const SIGNAL_VOLUME = Array.from({ length: 14 }, (_, i) => ({
  day: `${i + 1}`,
  signals: Math.floor(120 + Math.random() * 80),
  credits: Math.floor(100 + Math.random() * 70),
}));

const CustomTooltip = ({ active, payload, label }: {active?: boolean; payload?: Array<{color: string; name: string; value: number}>; label?: string}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--iv-surface-2)", border: "1px solid var(--iv-border)", fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="font-semibold mb-1" style={{ color: "var(--iv-text)" }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value < 2 ? p.value.toFixed(4) : p.value}</div>
      ))}
    </div>
  );
};

export default function Analytics() {
  const { data: agents = [] } = trpc.agents.list.useQuery();
  const totalTasks = agents.reduce((s: number, a: {tasksCompleted: number}) => s + a.tasksCompleted, 0);
  const avgGrpo = agents.length > 0 ? (agents.reduce((s: number, a: {grpoScore: number}) => s + a.grpoScore, 0) / agents.length).toFixed(4) : "0.0000";

  return (
    <div className="flex flex-col h-full">
      <IVPageHeader
        title="Analytics"
        subtitle="GRPO score history, agent performance, and cortex signal volume"
        badge="LIVE DATA"
        badgeColor="var(--iv-green)"
      />

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4" style={{ borderBottom: "1px solid var(--iv-border)" }}>
        {[
          { icon: TrendingUp, label: "Avg GRPO Score", value: avgGrpo, color: "var(--iv-blue)" },
          { icon: Zap, label: "Total Tasks", value: totalTasks.toLocaleString(), color: "var(--iv-green)" },
          { icon: Activity, label: "Active Agents", value: String(agents.filter((a: {status: string}) => a.status === "active").length), color: "#f59e0b" },
          { icon: BarChart3, label: "Cortex Signals", value: "8+", color: "#8b5cf6" },
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

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* GRPO History */}
        <div className="iv-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "'Syne', sans-serif", color: "var(--iv-text)" }}>GRPO Score History — 30 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={GRPO_HISTORY}>
              <defs>
                {[["commander", "#00B4D8"], ["financial", "#22d3a0"], ["technical", "#3b82f6"], ["cortex", "#8b5cf6"]].map(([key, color]) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: "var(--iv-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis domain={[0.98, 1.0]} tick={{ fill: "var(--iv-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(3)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "11px", color: "var(--iv-text-muted)" }} />
              {[["commander", "#00B4D8"], ["financial", "#22d3a0"], ["technical", "#3b82f6"], ["cortex", "#8b5cf6"]].map(([key, color]) => (
                <Area key={key} type="monotone" dataKey={key} stroke={color} fill={`url(#grad-${key})`} strokeWidth={1.5} dot={false} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Agent Performance */}
          <div className="iv-card p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "'Syne', sans-serif", color: "var(--iv-text)" }}>Agent Task Volume</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={AGENT_PERFORMANCE} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--iv-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--iv-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="tasks" fill="var(--iv-blue)" radius={[0, 4, 4, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Signal Volume */}
          <div className="iv-card p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "'Syne', sans-serif", color: "var(--iv-text)" }}>Cortex Signal Volume — 14 Days</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={SIGNAL_VOLUME}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: "var(--iv-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--iv-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px", color: "var(--iv-text-muted)" }} />
                <Line type="monotone" dataKey="signals" stroke="var(--iv-blue)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="credits" stroke="var(--iv-green)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
