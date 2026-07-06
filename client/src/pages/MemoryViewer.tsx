import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Brain, Tag, Calendar, ChevronRight, Activity } from "lucide-react";
import { Streamdown } from "streamdown";
import IVPageHeader from "@/components/IVPageHeader";

export default function MemoryViewer() {
  const [selected, setSelected] = useState<number | null>(null);
  const { data: entries = [], isLoading } = trpc.memory.list.useQuery({ limit: 30 });
  const { data: signals = [] } = trpc.cortex.signals.useQuery({ limit: 20 });

  type MemoryEntry = {id: number; sprintId: string|null; sessionType: string|null; title: string; content: string; phase: string|null; tags: unknown; createdAt: Date};
  const selectedEntry = (entries as MemoryEntry[]).find((e) => e.id === selected);

  return (
    <div className="flex flex-col h-full">
      <IVPageHeader
        title="Memory Viewer"
        subtitle="Sprint memory entries and live cortex signal feed"
        badge={`${entries.length} entries`}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Memory entries list */}
        <div className="w-80 shrink-0 overflow-y-auto" style={{ borderRight: "1px solid var(--iv-border)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--iv-border)" }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--iv-text-muted)" }}>Sprint Memory</span>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-lg animate-pulse" style={{ backgroundColor: "var(--iv-surface)" }} />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-center">
              <Brain size={24} className="mx-auto mb-2" style={{ color: "var(--iv-text-muted)", opacity: 0.4 }} />
              <p className="text-xs" style={{ color: "var(--iv-text-muted)" }}>No memory entries. Seed demo data first.</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
            {(entries as MemoryEntry[]).map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelected(entry.id === selected ? null : entry.id)}
                  className="w-full text-left px-3 py-3 rounded-lg transition-all"
                  style={{
                    backgroundColor: selected === entry.id ? "rgba(0,180,216,0.1)" : "transparent",
                    border: `1px solid ${selected === entry.id ? "rgba(0,180,216,0.3)" : "transparent"}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate mb-0.5" style={{ color: "var(--iv-text)" }}>{entry.title}</div>
                      <div className="flex items-center gap-2">
                        {entry.sprintId && <span className="text-xs font-mono" style={{ color: "var(--iv-blue)", fontSize: "10px" }}>{entry.sprintId}</span>}
                        {entry.phase && <span className="text-xs font-mono" style={{ color: "var(--iv-text-muted)", fontSize: "10px" }}>{entry.phase}</span>}
                      </div>
                    </div>
                    <ChevronRight size={12} style={{ color: "var(--iv-text-muted)", flexShrink: 0, marginTop: 2 }} />
                  </div>
                  {entry.sessionType && <div className="text-xs mt-1" style={{ color: "var(--iv-text-muted)", fontSize: "10px" }}>{entry.sessionType}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Detail + Signal feed */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedEntry ? (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center gap-3 mb-4">
                {selectedEntry.sprintId && <span className="text-xs px-2 py-1 rounded font-mono" style={{ backgroundColor: "rgba(0,180,216,0.15)", color: "var(--iv-blue)" }}>{selectedEntry.sprintId}</span>}
                {selectedEntry.phase && <span className="text-xs px-2 py-1 rounded font-mono" style={{ backgroundColor: "var(--iv-surface)", color: "var(--iv-text-muted)", border: "1px solid var(--iv-border)" }}>{selectedEntry.phase}</span>}
                <div className="flex items-center gap-1 ml-auto">
                  <Calendar size={11} style={{ color: "var(--iv-text-muted)" }} />
                  <span className="text-xs" style={{ color: "var(--iv-text-muted)" }}>{new Date(selectedEntry.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "'Syne', sans-serif", color: "var(--iv-text)" }}>{selectedEntry.title}</h2>
              <div className="iv-card p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--iv-text)" }}>{String(selectedEntry.content)}</p>
              </div>
              {Boolean(selectedEntry.tags) && (selectedEntry.tags as string[])?.length > 0 && (
                <div className="flex items-center gap-2 mt-4">
                  <Tag size={12} style={{ color: "var(--iv-text-muted)" }} />
                  {(selectedEntry.tags as string[]).map((tag: string) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded font-mono" style={{ backgroundColor: "var(--iv-surface)", color: "var(--iv-text-muted)", border: "1px solid var(--iv-border)" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={14} style={{ color: "var(--iv-blue)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--iv-text)" }}>Live Cortex Signal Feed</span>
                <div className="w-1.5 h-1.5 rounded-full iv-pulse ml-1" style={{ backgroundColor: "var(--iv-green)" }} />
              </div>
              <div className="space-y-2">
                {signals.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--iv-text-muted)" }}>No signals yet. Seed demo data from Command Centre.</p>
                ) : signals.map((sig: {id: number; category: string; grpoScore: number; outcomeSignal: string; agentId: string|null; skillsUsed: string[]|null; createdAt: Date}) => (
                  <div key={sig.id} className="iv-card px-4 py-3 flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--iv-green)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold" style={{ color: "var(--iv-blue)" }}>{sig.category}</span>
                        <span className="text-xs" style={{ color: "var(--iv-text-muted)" }}>→</span>
                        <span className="text-xs" style={{ color: "var(--iv-green)" }}>{sig.outcomeSignal}</span>
                      </div>
                      {sig.skillsUsed && (
                        <div className="text-xs mt-0.5 font-mono" style={{ color: "var(--iv-text-muted)", fontSize: "10px" }}>
                          skills: {(sig.skillsUsed as string[]).join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold font-mono" style={{ color: "var(--iv-blue)" }}>{sig.grpoScore.toFixed(4)}</div>
                      <div className="text-xs" style={{ color: "var(--iv-text-muted)", fontSize: "10px" }}>{sig.agentId}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
