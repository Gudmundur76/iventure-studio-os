import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type LeadStatus = "new" | "contacted" | "qualified" | "closed";

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  contacted: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  qualified: "bg-green-500/15 text-green-400 border-green-500/30",
  closed: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

export default function Leads() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const { data: leads = [], refetch } = trpc.publicChat.leads.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const { data: messages = [] } = trpc.publicChat.getMessages.useQuery(
    { sessionId: selectedSession ?? "" },
    { enabled: !!selectedSession }
  );

  const updateStatus = trpc.publicChat.updateLeadStatus.useMutation({
    onSuccess: () => refetch(),
  });

  const selectedLead = leads.find(l => l.sessionId === selectedSession);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conversations from iventure.studio — {leads.length} total
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads list */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {leads.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No leads yet. Conversations from iventure.studio will appear here.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {leads.map((lead) => (
                    <button
                      key={lead.sessionId}
                      onClick={() => setSelectedSession(lead.sessionId)}
                      className={`w-full text-left px-4 py-3 hover:bg-accent/40 transition-colors ${
                        selectedSession === lead.sessionId ? "bg-accent/60" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">
                              {lead.visitorName ?? "Anonymous"}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[lead.status as LeadStatus]}`}
                            >
                              {lead.status}
                            </span>
                          </div>
                          {lead.visitorEmail && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {lead.visitorEmail}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(lead.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Session viewer */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selectedLead
                  ? (selectedLead.visitorName ?? "Anonymous") + " — Conversation"
                  : "Select a lead"}
              </CardTitle>
              {selectedLead && (
                <Select
                  value={selectedLead.status}
                  onValueChange={(val) =>
                    updateStatus.mutate({ sessionId: selectedLead.sessionId, status: val as LeadStatus })
                  }
                >
                  <SelectTrigger className="w-32 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            {selectedLead?.visitorEmail && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{selectedLead.visitorEmail}</span>
                <a
                  href={`mailto:${selectedLead.visitorEmail}`}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Send email →
                </a>
              </div>
            )}
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <ScrollArea className="h-[540px] p-4">
              {!selectedSession ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Select a conversation to view messages
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No messages found
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.filter(m => m.role !== "system").map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-blue-500/15 border border-blue-500/25 text-blue-100"
                            : "bg-white/5 border border-white/10 text-gray-200"
                        }`}
                      >
                        <div className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                          {msg.role === "user" ? "Visitor" : "Velorah"}
                        </div>
                        {msg.content}
                        <div className="text-[10px] text-muted-foreground mt-1 text-right">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
