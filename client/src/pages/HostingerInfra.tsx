import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Globe, Server, Plus, Trash2, RefreshCw, Activity } from "lucide-react";

const DNS_TYPES = ["A", "CNAME", "MX", "TXT", "AAAA"] as const;

export default function HostingerInfra() {
  const [domain, setDomain] = useState("gummi.lt");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"A" | "CNAME" | "MX" | "TXT" | "AAAA">("A");
  const [newContent, setNewContent] = useState("");
  const [newTtl, setNewTtl] = useState("3600");

  const { data: dnsRecords, isLoading: dnsLoading, refetch: refetchDns } =
    trpc.hostinger.dnsList.useQuery({ domain });

  const { data: vpsHealth, refetch: refetchHealth } =
    trpc.hostinger.vpsHealth.useQuery();

  const { data: domains } = trpc.hostinger.domainsList.useQuery();

  const addDns = trpc.hostinger.dnsAdd.useMutation({
    onSuccess: () => {
      toast.success("DNS record added");
      setNewName(""); setNewContent("");
      refetchDns();
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const deleteDns = trpc.hostinger.dnsDelete.useMutation({
    onSuccess: () => { toast.success("DNS record deleted"); refetchDns(); },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6 text-purple-400" />
            Hostinger Infrastructure
          </h1>
          <p className="text-muted-foreground text-sm mt-1">DNS management and VPS health for gummi.lt</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetchDns(); refetchHealth(); }}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* VPS Health */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" /> VPS Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vpsHealth ? (
            <div className="flex items-center gap-3">
              <Badge variant={vpsHealth.status === "ok" ? "default" : "destructive"}>
                {vpsHealth.status === "ok" ? "Online" : "Error"}
              </Badge>
              <span className="text-sm text-muted-foreground font-mono whitespace-pre-wrap">{vpsHealth.message}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Checking…</span>
          )}
        </CardContent>
      </Card>

      {/* Domains */}
      {domains && domains.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="w-4 h-4" /> Registered Domains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {domains.map((d) => (
                <Badge
                  key={d.domain}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => setDomain(d.domain)}
                >
                  {d.domain}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DNS Records */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 justify-between">
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4" /> DNS Records — {domain}
            </span>
            <div className="flex items-center gap-2">
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-40 h-7 text-sm"
                placeholder="domain.tld"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add record form */}
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="name (e.g. client1)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-36 h-8 text-sm"
            />
            <Select value={newType} onValueChange={(v) => setNewType(v as typeof newType)}>
              <SelectTrigger className="w-24 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DNS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="content (IP or hostname)"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="flex-1 min-w-40 h-8 text-sm"
            />
            <Input
              placeholder="TTL"
              value={newTtl}
              onChange={(e) => setNewTtl(e.target.value)}
              className="w-20 h-8 text-sm"
            />
            <Button
              size="sm"
              className="h-8"
              disabled={!newName || !newContent || addDns.isPending}
              onClick={() => addDns.mutate({ domain, name: newName, type: newType, content: newContent, ttl: Number(newTtl) || 3600 })}
            >
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>

          <Separator />

          {/* Records table */}
          {dnsLoading ? (
            <div className="text-sm text-muted-foreground">Loading DNS records…</div>
          ) : dnsRecords && dnsRecords.length > 0 ? (
            <div className="space-y-1">
              {dnsRecords.map((rec, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50 group text-sm">
                  <Badge variant="outline" className="w-14 justify-center text-xs">{rec.type}</Badge>
                  <span className="font-mono w-32 truncate">{rec.name || "@"}</span>
                  <span className="flex-1 text-muted-foreground font-mono truncate">
                    {rec.records.map((r) => r.content).join(", ")}
                  </span>
                  <span className="text-xs text-muted-foreground w-16 text-right">{rec.ttl}s</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => deleteDns.mutate({ domain, name: rec.name, type: rec.type as "A" | "CNAME" | "MX" | "TXT" | "AAAA" })}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No DNS records found for {domain}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
