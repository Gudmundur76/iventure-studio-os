import { useState } from "react";
import IVLayout from "@/components/IVLayout";
import { trpc } from "@/lib/trpc";
import { Mail, RefreshCw, Reply, Eye, Inbox, Send, ChevronRight, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const AGENTS = [
  { id: "nanoclaw", name: "NanoClaw", color: "#00B4D8" },
  { id: "cortex", name: "Cortex", color: "#7C3AED" },
  { id: "scout", name: "Scout", color: "#10B981" },
];

export default function AgentInbox() {
  const [selectedAgent, setSelectedAgent] = useState("nanoclaw");
  const [selectedEmail, setSelectedEmail] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [showReply, setShowReply] = useState(false);
  const [syncQuery, setSyncQuery] = useState("in:inbox");

  const { data: emails = [], refetch, isLoading } = trpc.email.list.useQuery(
    { agentId: selectedAgent, limit: 50 },
    { refetchInterval: 30000 }
  );

  const syncMut = trpc.email.sync.useMutation({
    onSuccess: (d) => {
      toast.success(`Synced ${d.synced} emails, saved ${d.saved} new`);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const markReadMut = trpc.email.markRead.useMutation({
    onSuccess: () => refetch(),
  });

  const replyMut = trpc.email.reply.useMutation({
    onSuccess: () => {
      toast.success("Reply sent");
      setShowReply(false);
      setReplyBody("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const selected = emails.find(e => e.id === selectedEmail);
  const unread = emails.filter(e => !e.isRead).length;

  return (
    <IVLayout>
      <div className="flex flex-col h-full" style={{ backgroundColor: "var(--iv-navy)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--iv-border)" }}>
          <div className="flex items-center gap-3">
            <Mail size={20} style={{ color: "var(--iv-blue)" }} />
            <h1 className="text-lg font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--iv-text)" }}>
              Agent Inbox
            </h1>
            {unread > 0 && (
              <Badge style={{ backgroundColor: "var(--iv-blue)", color: "#0A2342" }}>{unread} unread</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={syncQuery}
              onChange={e => setSyncQuery(e.target.value)}
              placeholder="Gmail query (e.g. in:inbox)"
              className="w-48 h-8 text-xs"
              style={{ backgroundColor: "var(--iv-surface)", borderColor: "var(--iv-border)", color: "var(--iv-text)" }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => syncMut.mutate({ agentId: selectedAgent, query: syncQuery })}
              disabled={syncMut.isPending}
              style={{ borderColor: "var(--iv-border)", color: "var(--iv-text)" }}
            >
              <RefreshCw size={14} className={syncMut.isPending ? "animate-spin" : ""} />
              <span className="ml-1">Sync Gmail</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Agent selector */}
          <div className="w-44 shrink-0 py-3 px-2" style={{ borderRight: "1px solid var(--iv-border)" }}>
            <div className="text-xs font-semibold mb-2 px-2" style={{ color: "var(--iv-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
              AGENTS
            </div>
            {AGENTS.map(agent => (
              <button
                key={agent.id}
                onClick={() => { setSelectedAgent(agent.id); setSelectedEmail(null); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-1 text-left transition-all"
                style={{
                  backgroundColor: selectedAgent === agent.id ? "rgba(0,180,216,0.12)" : "transparent",
                  color: selectedAgent === agent.id ? "var(--iv-blue)" : "var(--iv-text)",
                }}
              >
                <Bot size={14} style={{ color: agent.color }} />
                <span className="text-sm">{agent.name}</span>
              </button>
            ))}
          </div>

          {/* Email list */}
          <div className="w-80 shrink-0 overflow-y-auto" style={{ borderRight: "1px solid var(--iv-border)" }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-32" style={{ color: "var(--iv-muted)" }}>
                <RefreshCw size={16} className="animate-spin mr-2" /> Loading...
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3" style={{ color: "var(--iv-muted)" }}>
                <Inbox size={32} />
                <div className="text-sm">No emails yet</div>
                <div className="text-xs text-center px-4">Click "Sync Gmail" to pull emails from your inbox</div>
              </div>
            ) : (
              emails.map(email => (
                <button
                  key={email.id}
                  onClick={() => {
                    setSelectedEmail(email.id);
                    if (!email.isRead) markReadMut.mutate({ id: email.id });
                  }}
                  className="w-full text-left px-4 py-3 border-b transition-all hover:bg-white/5"
                  style={{
                    borderColor: "var(--iv-border)",
                    backgroundColor: selectedEmail === email.id ? "rgba(0,180,216,0.08)" : "transparent",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {!email.isRead && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--iv-blue)" }} />}
                        <span className="text-xs font-medium truncate" style={{ color: email.isRead ? "var(--iv-muted)" : "var(--iv-text)" }}>
                          {email.fromAddress ?? "Unknown"}
                        </span>
                      </div>
                      <div className="text-xs font-semibold truncate mb-0.5" style={{ color: "var(--iv-text)" }}>
                        {email.subject ?? "(no subject)"}
                      </div>
                      <div className="text-xs truncate" style={{ color: "var(--iv-muted)" }}>
                        {email.snippet ?? ""}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {email.direction === "outbound" ? (
                        <Send size={10} style={{ color: "var(--iv-blue)" }} />
                      ) : (
                        <Mail size={10} style={{ color: "var(--iv-muted)" }} />
                      )}
                      {email.isReplied && <Badge variant="outline" className="text-[9px] px-1 py-0">replied</Badge>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Email detail */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "var(--iv-muted)" }}>
                <Mail size={40} />
                <div className="text-sm">Select an email to read</div>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-bold mb-2" style={{ color: "var(--iv-text)", fontFamily: "'Syne', sans-serif" }}>
                    {selected.subject ?? "(no subject)"}
                  </h2>
                  <div className="flex items-center gap-4 text-xs mb-4" style={{ color: "var(--iv-muted)" }}>
                    <span>From: <span style={{ color: "var(--iv-text)" }}>{selected.fromAddress ?? "—"}</span></span>
                    <span>To: <span style={{ color: "var(--iv-text)" }}>{selected.toAddress ?? "—"}</span></span>
                    {selected.sentAt && <span>{new Date(selected.sentAt).toLocaleString()}</span>}
                  </div>
                  <div className="rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap" style={{ backgroundColor: "var(--iv-surface)", color: "var(--iv-text)", border: "1px solid var(--iv-border)" }}>
                    {selected.body ?? selected.snippet ?? "(no content)"}
                  </div>
                </div>

                {selected.agentReply && (
                  <div className="mb-6 rounded-lg p-4" style={{ backgroundColor: "rgba(0,180,216,0.08)", border: "1px solid rgba(0,180,216,0.3)" }}>
                    <div className="text-xs font-semibold mb-2" style={{ color: "var(--iv-blue)", fontFamily: "'JetBrains Mono', monospace" }}>
                      AGENT REPLY
                    </div>
                    <div className="text-sm whitespace-pre-wrap" style={{ color: "var(--iv-text)" }}>
                      {selected.agentReply}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mb-4">
                  <Button
                    size="sm"
                    onClick={() => setShowReply(!showReply)}
                    style={{ backgroundColor: "var(--iv-blue)", color: "#0A2342" }}
                  >
                    <Reply size={14} className="mr-1" /> Reply
                  </Button>
                  <Button size="sm" variant="outline" style={{ borderColor: "var(--iv-border)", color: "var(--iv-text)" }}>
                    <Eye size={14} className="mr-1" /> Mark Read
                  </Button>
                </div>

                {showReply && (
                  <div className="rounded-lg p-4" style={{ backgroundColor: "var(--iv-surface)", border: "1px solid var(--iv-border)" }}>
                    <div className="text-xs font-semibold mb-2" style={{ color: "var(--iv-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                      COMPOSE REPLY
                    </div>
                    <Textarea
                      value={replyBody}
                      onChange={e => setReplyBody(e.target.value)}
                      placeholder="Write your reply..."
                      rows={5}
                      className="mb-3 text-sm"
                      style={{ backgroundColor: "var(--iv-navy)", borderColor: "var(--iv-border)", color: "var(--iv-text)" }}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => replyMut.mutate({
                          id: selected.id,
                          to: selected.fromAddress ?? "",
                          subject: `Re: ${selected.subject ?? ""}`,
                          body: replyBody,
                        })}
                        disabled={replyMut.isPending || !replyBody.trim()}
                        style={{ backgroundColor: "var(--iv-blue)", color: "#0A2342" }}
                      >
                        <Send size={14} className="mr-1" />
                        {replyMut.isPending ? "Sending..." : "Send Reply"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowReply(false)} style={{ borderColor: "var(--iv-border)", color: "var(--iv-text)" }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </IVLayout>
  );
}
