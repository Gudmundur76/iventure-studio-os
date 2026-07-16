import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Send, Bot, User, Terminal, RefreshCw, Users, Inbox, Wrench, ListTodo, ChevronRight } from "lucide-react";
import { Streamdown } from "streamdown";
import IVPageHeader from "@/components/IVPageHeader";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

const SESSION_ID = "cc-session-" + Date.now();

interface Message {
  role: "user" | "assistant";
  content: string;
  model?: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    contacted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    qualified: "bg-green-500/20 text-green-400 border-green-500/30",
    closed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[status] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>
      {status}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, sub, href, accent }: {
  icon: React.ElementType; label: string; value: number | string;
  sub?: string; href?: string; accent?: string;
}) {
  const inner = (
    <Card className="bg-[#0f1117] border-white/10 hover:border-white/20 transition-colors cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-white/50 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${accent ?? "text-white"}`}>{value}</p>
            {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
          </div>
          <div className="flex items-center gap-1">
            <Icon className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
            {href && <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

export default function CommandCentre() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "**iVenture Studio OS** — Command Centre online.\n\nI am your AI orchestrator. I can help you:\n- Route tasks to the right VMOA agent\n- Analyse financial, legal, or marketing intelligence\n- Query the VIC Cortex knowledge base\n- Manage your client portfolio\n\nWhat would you like to accomplish today?" }
  ]);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-5");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: models = [] } = trpc.chat.models.useQuery();
  const { data: summary, refetch: refetchSummary } = trpc.dashboard.summary.useQuery(undefined, { refetchInterval: 30000 });
  const sendMutation = trpc.chat.send.useMutation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput("");
    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    try {
      const result = await sendMutation.mutateAsync({
        sessionId: SESSION_ID,
        message: text,
        model: selectedModel,
        history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      });
      setMessages(prev => [...prev, { role: "assistant", content: result.content, model: result.model ?? selectedModel }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Connection error. Please try again." }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full">
      <IVPageHeader
        title="Command Centre"
        subtitle="iVenture Studio OS — live metrics and AI orchestrator"
        
        actions={
          <button
            onClick={() => refetchSummary()}
            className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Live Metrics */}
        <div>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Live Metrics</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard icon={Inbox} label="New Leads" value={summary?.leads.new ?? 0}
              sub={`${summary?.leads.total ?? 0} total`} href="/os/leads"
              accent={summary?.leads.new ? "text-blue-400" : "text-white"} />
            <MetricCard icon={ListTodo} label="Active Tasks" value={summary?.tasks.pending ?? 0}
              sub={`${summary?.tasks.total ?? 0} total`} href="/os/worker"
              accent={summary?.tasks.pending ? "text-yellow-400" : "text-white"} />
            <MetricCard icon={Users} label="Clients" value={summary?.clients.total ?? 0} href="/os/clients" />
            <MetricCard icon={Wrench} label="Healing Queue" value={summary?.healing.pending ?? 0}
              sub={`${summary?.healing.applied ?? 0} applied`} href="/os/healing"
              accent={summary?.healing.pending ? "text-orange-400" : "text-white"} />
          </div>
        </div>

        {/* Recent Leads */}
        {summary?.leads.recent && summary.leads.recent.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Recent Leads</h2>
              <Link href="/os/leads" className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {summary.leads.recent.map(lead => (
                <Link key={lead.id} href="/os/leads">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f1117] border border-white/10 hover:border-white/20 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/60 shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{lead.name}</p>
                        <p className="text-xs text-white/40 truncate">{lead.email ?? "No email"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={lead.status} />
                      <span className="text-xs text-white/30">{new Date(lead.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* AI Orchestrator */}
        <div>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">AI Orchestrator</h2>
          <div className="bg-[#0f1117] border border-white/10 rounded-xl overflow-hidden">
            <div className="h-64 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3 h-3 text-violet-400" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.role === "user" ? "bg-violet-600/30 text-white border border-violet-500/30" : "bg-white/5 text-white/90 border border-white/10"}`}>
                    {msg.role === "assistant" ? <Streamdown>{msg.content}</Streamdown> : <p>{msg.content}</p>}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3 h-3 text-white/60" />
                    </div>
                  )}
                </div>
              ))}
              {sendMutation.isPending && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Bot className="w-3 h-3 text-violet-400" />
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-white/10 p-3 flex gap-2 items-end">
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
                className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/60 focus:outline-none shrink-0">
                {models.length > 0 ? models.map((m: { id: string; name?: string }) => (
                  <option key={m.id} value={m.id}>{m.name ?? m.id}</option>
                )) : <option value="claude-sonnet-4-5">Claude Sonnet</option>}
              </select>
              <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown} placeholder="Ask the orchestrator anything..." rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/30 resize-none focus:outline-none py-1.5" />
              <button onClick={handleSend} disabled={!input.trim() || sendMutation.isPending}
                className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0">
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
