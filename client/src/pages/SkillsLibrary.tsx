import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Search, Zap, TrendingUp, Clock } from "lucide-react";
import IVPageHeader from "@/components/IVPageHeader";

const CATEGORIES = ["all", "Finance", "Legal", "Marketing", "Research", "Technical", "Integrations", "Cortex", "Network", "Intelligence"];

const CATEGORY_COLORS: Record<string, string> = {
  Finance: "#22d3a0",
  Legal: "#8b5cf6",
  Marketing: "#f59e0b",
  Research: "#06b6d4",
  Technical: "#3b82f6",
  Integrations: "#ec4899",
  Cortex: "#00B4D8",
  Network: "#10b981",
  Intelligence: "#f97316",
};

export default function SkillsLibrary() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const { data: skills = [], isLoading } = trpc.skills.list.useQuery({ category: selectedCategory });

  const filtered = skills.filter((s: {name: string; description: string|null}) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <IVPageHeader
        title="Skills Library"
        subtitle="20 agent skills across 10 categories"
        badge={`${skills.length} skills`}
      />

      {/* Controls */}
      <div className="px-6 py-4 flex items-center gap-4" style={{ borderBottom: "1px solid var(--iv-border)" }}>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--iv-text-muted)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search skills..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: "var(--iv-surface)", color: "var(--iv-text)", border: "1px solid var(--iv-border)" }}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: selectedCategory === cat ? "var(--iv-blue)" : "var(--iv-surface)",
                color: selectedCategory === cat ? "var(--iv-navy)" : "var(--iv-text-muted)",
                border: `1px solid ${selectedCategory === cat ? "var(--iv-blue)" : "var(--iv-border)"}`,
              }}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Skills grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="iv-card p-4 animate-pulse h-36" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Zap size={32} style={{ color: "var(--iv-text-muted)", opacity: 0.4 }} />
            <p className="text-sm" style={{ color: "var(--iv-text-muted)" }}>No skills found. Try seeding demo data from Command Centre.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((skill: {id: number; skillId: string; name: string; category: string; description: string|null; usageCount: number; lastUsed: Date|null; isActive: boolean}) => {
              const color = CATEGORY_COLORS[skill.category] ?? "var(--iv-blue)";
              return (
                <div key={skill.id} className="iv-card p-4 transition-all hover:iv-glow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                        <Zap size={13} style={{ color }} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "var(--iv-text)" }}>{skill.name}</div>
                        <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: `${color}18`, color, fontSize: "10px" }}>
                          {skill.category}
                        </span>
                      </div>
                    </div>
                    {!skill.isActive && <span className="text-xs iv-badge-offline px-1.5 py-0.5 rounded">INACTIVE</span>}
                  </div>
                  <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--iv-text-muted)" }}>{skill.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={11} style={{ color: "var(--iv-text-muted)" }} />
                      <span className="text-xs font-mono" style={{ color: "var(--iv-blue)" }}>{skill.usageCount.toLocaleString()} uses</span>
                    </div>
                    {skill.lastUsed && (
                      <div className="flex items-center gap-1">
                        <Clock size={10} style={{ color: "var(--iv-text-muted)" }} />
                        <span className="text-xs" style={{ color: "var(--iv-text-muted)" }}>
                          {Math.round((Date.now() - new Date(skill.lastUsed).getTime()) / 3600000)}h ago
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
