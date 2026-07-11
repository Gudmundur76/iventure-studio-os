import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Package, RefreshCw, Play, CheckCircle, XCircle, Loader2 } from "lucide-react";

const TOOLS = [
  { name: "coolify_list_applications", label: "List Applications", args: {} },
  { name: "coolify_list_servers", label: "List Servers", args: {} },
  { name: "coolify_list_projects", label: "List Projects", args: {} },
  { name: "coolify_list_services", label: "List Services", args: {} },
  { name: "coolify_get_application", label: "Get Application", args: { uuid: "pk34tjuje0frawjr55yy0ipm" } },
  { name: "coolify_get_server_resources", label: "Server Resources", args: { server_uuid: "d14ac0ui3w7n9pqdntcg4u8x" } },
  { name: "coolify_list_env_vars", label: "List Env Vars", args: { application_uuid: "pk34tjuje0frawjr55yy0ipm" } },
  { name: "coolify_list_deployments", label: "List Deployments", args: { application_uuid: "pk34tjuje0frawjr55yy0ipm" } },
  { name: "coolify_deploy_application", label: "Deploy Application", args: { uuid: "pk34tjuje0frawjr55yy0ipm" } },
  { name: "coolify_restart_application", label: "Restart Application", args: { uuid: "pk34tjuje0frawjr55yy0ipm" } },
  { name: "coolify_stop_application", label: "Stop Application", args: { uuid: "pk34tjuje0frawjr55yy0ipm" } },
  { name: "coolify_start_application", label: "Start Application", args: { uuid: "pk34tjuje0frawjr55yy0ipm" } },
];

export default function CoolifyMCP() {
  const [selectedTool, setSelectedTool] = useState(TOOLS[0].name);
  const [argsJson, setArgsJson] = useState(JSON.stringify(TOOLS[0].args, null, 2));
  const [result, setResult] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);

  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = trpc.coolify.health.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const callTool = trpc.coolify.callTool.useMutation({
    onSuccess: (data) => {
      setResult(JSON.stringify(data, null, 2));
      setIsRunning(false);
    },
    onError: (err) => {
      setResult(`Error: ${err.message}`);
      setIsRunning(false);
      toast.error("Tool call failed: " + err.message);
    },
  });

  const handleToolSelect = (toolName: string) => {
    setSelectedTool(toolName);
    const tool = TOOLS.find(t => t.name === toolName);
    if (tool) setArgsJson(JSON.stringify(tool.args, null, 2));
  };

  const handleRun = () => {
    try {
      const args = JSON.parse(argsJson);
      setIsRunning(true);
      setResult("");
      callTool.mutate({ tool: selectedTool, args });
    } catch {
      toast.error("Invalid JSON in arguments");
    }
  };

  return (
    <div className="p-6 space-y-6" style={{ color: "var(--iv-text)" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6" style={{ color: "var(--iv-blue)" }} />
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: "var(--iv-font-display)" }}>
              Coolify MCP
            </h1>
            <p className="text-sm" style={{ color: "var(--iv-muted)" }}>
              Infrastructure management via Model Context Protocol
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {healthLoading ? (
            <Badge variant="outline">Checking...</Badge>
          ) : health?.ok ? (
            <Badge className="gap-1" style={{ background: "var(--iv-green)", color: "#fff" }}>
              <CheckCircle className="w-3 h-3" /> {health.tools} tools live
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="w-3 h-3" /> Offline
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => refetchHealth()}>
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Connection info */}
      <Card style={{ background: "var(--iv-surface)", border: "1px solid var(--iv-border)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono" style={{ color: "var(--iv-muted)" }}>
            MCP SSE Endpoint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <code className="text-sm" style={{ color: "var(--iv-blue)" }}>
            http://187.124.213.194:8766/sse
          </code>
          <p className="text-xs mt-2" style={{ color: "var(--iv-muted)" }}>
            Connect from Manus, Kimi, SkyWork, or any MCP-compatible AI tool using this SSE URL.
          </p>
        </CardContent>
      </Card>

      {/* Tool runner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card style={{ background: "var(--iv-surface)", border: "1px solid var(--iv-border)" }}>
          <CardHeader>
            <CardTitle className="text-sm">Tool Runner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--iv-muted)" }}>Select Tool</label>
              <Select value={selectedTool} onValueChange={handleToolSelect}>
                <SelectTrigger style={{ background: "var(--iv-navy)", border: "1px solid var(--iv-border)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOOLS.map(t => (
                    <SelectItem key={t.name} value={t.name}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--iv-muted)" }}>Arguments (JSON)</label>
              <Textarea
                value={argsJson}
                onChange={e => setArgsJson(e.target.value)}
                rows={6}
                className="font-mono text-xs"
                style={{ background: "var(--iv-navy)", border: "1px solid var(--iv-border)" }}
              />
            </div>
            <Button
              onClick={handleRun}
              disabled={isRunning || !health?.ok}
              className="w-full gap-2"
              style={{ background: "var(--iv-blue)" }}
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isRunning ? "Running..." : "Run Tool"}
            </Button>
          </CardContent>
        </Card>

        <Card style={{ background: "var(--iv-surface)", border: "1px solid var(--iv-border)" }}>
          <CardHeader>
            <CardTitle className="text-sm">Result</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <pre
                className="text-xs overflow-auto rounded p-3 max-h-80"
                style={{ background: "var(--iv-navy)", color: "var(--iv-text)", fontFamily: "var(--iv-font-mono)" }}
              >
                {result}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-40 rounded" style={{ background: "var(--iv-navy)", color: "var(--iv-muted)" }}>
                <p className="text-sm">Run a tool to see results here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tool reference */}
      <Card style={{ background: "var(--iv-surface)", border: "1px solid var(--iv-border)" }}>
        <CardHeader>
          <CardTitle className="text-sm">Available Tools (15)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              "coolify_list_applications", "coolify_get_application", "coolify_deploy_application",
              "coolify_restart_application", "coolify_stop_application", "coolify_start_application",
              "coolify_list_deployments", "coolify_get_deployment_logs", "coolify_list_servers",
              "coolify_get_server_resources", "coolify_list_projects", "coolify_list_env_vars",
              "coolify_set_env_var", "coolify_delete_env_var", "coolify_list_services",
            ].map(name => (
              <code
                key={name}
                className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: "var(--iv-navy)", color: "var(--iv-blue)", fontFamily: "var(--iv-font-mono)" }}
                onClick={() => {
                  const tool = TOOLS.find(t => t.name === name);
                  if (tool) handleToolSelect(name);
                }}
              >
                {name}
              </code>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
