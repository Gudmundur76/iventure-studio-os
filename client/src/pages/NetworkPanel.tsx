import { trpc } from "@/lib/trpc";
import { Network, Shield, Star, Users, Copy } from "lucide-react";
import IVPageHeader from "@/components/IVPageHeader";
import { useState } from "react";
import { toast } from "sonner";

const PEER_NODES = [
  { nodeId: "node_a1b2c3d4", name: "Arnarson Ventures Node", country: "IS", grpoScore: 0.9891, peers: 7, status: "connected" as const, skills: ["finance", "legal", "research"] },
  { nodeId: "node_e5f6g7h8", name: "Nordic SaaS Node", country: "SE", grpoScore: 0.9834, peers: 12, status: "connected" as const, skills: ["marketing", "technical", "data"] },
  { nodeId: "node_i9j0k1l2", name: "Reykjavik Tech Hub", country: "IS", grpoScore: 0.9756, peers: 4, status: "connected" as const, skills: ["technical", "security", "cortex"] },
  { nodeId: "node_m3n4o5p6", name: "Berlin Startup Node", country: "DE", grpoScore: 0.9812, peers: 19, status: "pending" as const, skills: ["marketing", "finance", "legal"] },
  { nodeId: "node_q7r8s9t0", name: "Amsterdam OPC Node", country: "NL", grpoScore: 0.9778, peers: 8, status: "connected" as const, skills: ["research", "data", "cortex"] },
];

const MY_AGENT_CARD = {
  name: "iVenture Studio Node",
  version: "1.0",
  grpo_score: 0.9913,
  node_id: "node_iv_main_001",
  capabilities: {
    skills: ["finance", "marketing", "legal", "research", "technical", "cortex", "network"],
    languages: ["en", "is"],
    models: ["gpt-5", "claude-opus-4-5", "gemini-2.5-pro", "deepseek-v3"]
  },
  a2a_endpoint: "https://studio.iventure.studio/a2a",
  pricing: { per_task: 0.05, currency: "USD", payment: "stripe_connect" },
  reputation: { tasks_completed: 9541, avg_rating: 4.92, disputes: 0 }
};

export default function NetworkPanel() {
  const [copied, setCopied] = useState(false);
  const cardJson = JSON.stringify(MY_AGENT_CARD, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(cardJson);
    setCopied(true);
    toast.success("Agent card copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <IVPageHeader
        title="Network Panel (A2A)"
        subtitle="Agent-to-agent discovery, reputation, and peer coordination"
        badge="STUB → P11"
        badgeColor="rgba(245,158,11,0.8)"
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Agent Card */}
        <div className="w-96 shrink-0 overflow-y-auto p-5" style={{ borderRight: "1px solid var(--iv-border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Shield size={14} style={{ color: "var(--iv-blue)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--iv-text)" }}>My Agent Card</span>
            <span className="text-xs px-1.5 py-0.5 rounded font-mono ml-auto" style={{ backgroundColor: "rgba(34,211,160,0.15)", color: "var(--iv-green)", fontSize: "10px" }}>LIVE</span>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "GRPO Score", value: "0.9913", color: "var(--iv-blue)" },
              { label: "Tasks Done", value: "9,541", color: "var(--iv-green)" },
              { label: "Avg Rating", value: "4.92/5", color: "#f59e0b" },
              { label: "Peer Nodes", value: "5", color: "#8b5cf6" },
            ].map(({ label, value, color }) => (
              <div key={label} className="iv-card px-3 py-2">
                <div className="text-xs" style={{ color: "var(--iv-text-muted)" }}>{label}</div>
                <div className="text-sm font-bold font-mono" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>
          {/* JSON Card */}
          <div className="iv-card overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid var(--iv-border)" }}>
              <span className="text-xs font-mono" style={{ color: "var(--iv-text-muted)" }}>agent.json</span>
              <button onClick={handleCopy} className="flex items-center gap-1 text-xs transition-colors" style={{ color: copied ? "var(--iv-green)" : "var(--iv-blue)" }}>
                <Copy size={11} />{copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="p-3 text-xs overflow-x-auto" style={{ color: "var(--iv-text)", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", maxHeight: "320px" }}>
              {cardJson}
            </pre>
          </div>
        </div>

        {/* Right: Peer nodes */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={14} style={{ color: "var(--iv-blue)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--iv-text)" }}>Peer Nodes</span>
            <span className="text-xs font-mono ml-2" style={{ color: "var(--iv-text-muted)" }}>{PEER_NODES.filter(n => n.status === "connected").length} connected</span>
          </div>
          <div className="space-y-3">
            {PEER_NODES.map(node => (
              <div key={node.nodeId} className="iv-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: "var(--iv-text)" }}>{node.name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: "var(--iv-surface-2)", color: "var(--iv-text-muted)", fontSize: "10px" }}>{node.country}</span>
                    </div>
                    <span className="text-xs font-mono" style={{ color: "var(--iv-text-muted)", fontSize: "10px" }}>{node.nodeId}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono ${node.status === "connected" ? "iv-badge-active" : "iv-badge-idle"}`} style={{ fontSize: "10px" }}>
                    {node.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Star size={11} style={{ color: "#f59e0b" }} />
                    <span className="text-xs font-mono font-bold" style={{ color: "var(--iv-blue)" }}>{node.grpoScore.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Network size={11} style={{ color: "var(--iv-text-muted)" }} />
                    <span className="text-xs" style={{ color: "var(--iv-text-muted)" }}>{node.peers} peers</span>
                  </div>
                  <div className="flex gap-1 ml-auto">
                    {node.skills.map(s => (
                      <span key={s} className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: "rgba(0,180,216,0.08)", color: "var(--iv-text-muted)", fontSize: "10px" }}>{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
