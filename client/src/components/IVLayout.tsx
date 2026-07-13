import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Terminal, Bot, Zap, Brain, Network, Activity, BarChart3,
  FolderKanban, ListTodo, ChevronLeft, ChevronRight, Settings, LogOut, Layers,
  Cpu, Shield, Clock, Server, Package, Mail, Globe, CalendarClock,
  GitBranch, Wrench
} from "lucide-react";
import { Users, Building2, Settings2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

const NAV_ITEMS = [
  { path: "/os", icon: Terminal, label: "Command Centre", badge: null },
  { path: "/os/worker", icon: Bot, label: "NanoClaw Worker", badge: "LIVE" },
  { path: "/os/tasks", icon: ListTodo, label: "Task Queue", badge: null },
  { path: "/os/projects", icon: Layers, label: "Projects", badge: null },
  { path: "/os/agents", icon: Cpu, label: "VMOA Agents", badge: null },
  { path: "/os/skills", icon: Zap, label: "Skills Library", badge: null },
  { path: "/os/memory", icon: Brain, label: "Memory Viewer", badge: null },
  { path: "/os/network", icon: Network, label: "Network (A2A)", badge: null },
  { path: "/os/cortex", icon: Activity, label: "Cortex Panel", badge: null },
  { path: "/os/analytics", icon: BarChart3, label: "Analytics", badge: null },
  { path: "/os/portal", icon: FolderKanban, label: "Client Portal", badge: null },
  { path: "/os/clients", icon: Users, label: "Clients", badge: "NEW" },
  { path: "/os/tenants", icon: Building2, label: "Tenants", badge: "NEW" },
  { path: "/os/meta-agent", icon: Bot, label: "Mr. Agent", badge: "NEW" },
  { path: "/os/mr-agent-profile", icon: Settings2, label: "Agent Profile", badge: null },
  { path: "/os/code-graph", icon: GitBranch, label: "Code Graph", badge: null },
  { path: "/os/healing", icon: Wrench, label: "Healing", badge: null },
  { path: "/os/email", icon: Mail, label: "Agent Inbox", badge: "NEW" },
  { path: "/os/browser", icon: Globe, label: "Browser Worker", badge: "NEW" },
  { path: "/os/agent-schedules", icon: CalendarClock, label: "Agent Schedules", badge: "NEW" },
  { path: "/os/schedules", icon: Clock, label: "System Schedules", badge: null },
  { path: "/os/sandbox", icon: Server, label: "Sandbox Nodes", badge: "NEW" },
  { path: "/os/coolify", icon: Package, label: "Coolify MCP", badge: "MCP" },
  { path: "/os/hostinger", icon: Globe, label: "Hostinger Infra", badge: "DNS" },
];

interface IVLayoutProps {
  children: React.ReactNode;
}

export default function IVLayout({ children }: IVLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const { data: user } = trpc.auth.me.useQuery();
  const logout = trpc.auth.logout.useMutation();

  const handleLogout = () => {
    logout.mutate(undefined, { onSuccess: () => { window.location.href = "/login"; } });
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--iv-navy)" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col transition-all duration-300 ease-out shrink-0"
        style={{
          width: collapsed ? "64px" : "240px",
          backgroundColor: "var(--iv-surface)",
          borderRight: "1px solid var(--iv-border)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 shrink-0" style={{ borderBottom: "1px solid var(--iv-border)" }}>
          <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: "var(--iv-blue)", boxShadow: "0 0 12px rgba(0,180,216,0.4)" }}>
            <Cpu size={16} color="#0A2342" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-sm font-bold leading-tight" style={{ fontFamily: "'Syne', sans-serif", color: "var(--iv-text)" }}>
                iVenture
              </div>
              <div className="text-xs leading-tight" style={{ color: "var(--iv-blue)", fontFamily: "'JetBrains Mono', monospace" }}>
                Studio OS
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || (item.path !== "/os" && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className="flex items-center gap-3 mx-2 mb-0.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 group relative"
                  style={{
                    backgroundColor: isActive ? "rgba(0,180,216,0.12)" : "transparent",
                    borderLeft: isActive ? "2px solid var(--iv-blue)" : "2px solid transparent",
                  }}
                >
                  <Icon
                    size={17}
                    style={{ color: isActive ? "var(--iv-blue)" : "var(--iv-text-muted)", flexShrink: 0 }}
                  />
                  {!collapsed && (
                    <>
                      <span className="text-sm font-medium truncate" style={{ color: isActive ? "var(--iv-text)" : "var(--iv-text-muted)" }}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="ml-auto text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: "rgba(0,180,216,0.15)", color: "var(--iv-blue)", fontSize: "10px" }}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50" style={{ backgroundColor: "var(--iv-surface-2)", color: "var(--iv-text)", border: "1px solid var(--iv-border)" }}>
                      {item.label}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 p-3" style={{ borderTop: "1px solid var(--iv-border)" }}>
          {/* GRPO Score */}
          {!collapsed && (
            <div className="mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(0,180,216,0.08)", border: "1px solid rgba(0,180,216,0.2)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: "var(--iv-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>GRPO</span>
                <span className="text-xs font-bold" style={{ color: "var(--iv-blue)", fontFamily: "'JetBrains Mono', monospace" }}>0.9913</span>
              </div>
              <div className="grpo-bar" style={{ width: "99.13%" }} />
            </div>
          )}
          {/* User */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ backgroundColor: "var(--iv-blue)", color: "var(--iv-navy)" }}>
                {user.name?.[0] ?? "U"}
              </div>
              {!collapsed && (
                <>
                  <span className="text-xs truncate flex-1" style={{ color: "var(--iv-text-muted)" }}>{user.name ?? user.email}</span>
                  <button onClick={handleLogout} className="shrink-0 p-1 rounded hover:bg-white/5 transition-colors">
                    <LogOut size={13} style={{ color: "var(--iv-text-muted)" }} />
                  </button>
                </>
              )}
            </div>
          ) : (
            <a href="/login" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors" style={{ backgroundColor: "var(--iv-blue)", color: "var(--iv-navy)" }}>
              <Shield size={13} />
              {!collapsed && "Sign In"}
            </a>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-20 -right-3 w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10"
          style={{ backgroundColor: "var(--iv-surface-2)", border: "1px solid var(--iv-border)", color: "var(--iv-text-muted)" }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: "var(--iv-navy)" }}>
        {children}
      </main>
    </div>
  );
}
