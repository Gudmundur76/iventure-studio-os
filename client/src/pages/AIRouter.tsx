import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Zap, CheckCircle2, AlertCircle, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

// Provider colour map
const PROVIDER_COLORS: Record<string, string> = {
  Claude: "#d97706",
  GPT: "#10b981",
  Gemini: "#3b82f6",
  Grok: "#8b5cf6",
  DeepSeek: "#ef4444",
  Kimi: "#06b6d4",
  MiniMax: "#f59e0b",
  Mistral: "#ec4899",
  GLM: "#84cc16",
  Step: "#f97316",
  Devstral: "#6366f1",
  "GPT-OSS": "#10b981",
};

function getProviderColor(modelId: string): string {
  for (const [key, color] of Object.entries(PROVIDER_COLORS)) {
    if (modelId.startsWith(key)) return color;
  }
  return "#6b7280";
}

function getProviderName(modelId: string): string {
  if (modelId.startsWith("Claude")) return "Anthropic";
  if (modelId.startsWith("GPT-OSS")) return "OpenAI OSS";
  if (modelId.startsWith("GPT")) return "OpenAI";
  if (modelId.startsWith("Gemini")) return "Google";
  if (modelId.startsWith("Grok")) return "xAI";
  if (modelId.startsWith("DeepSeek")) return "DeepSeek";
  if (modelId.startsWith("Kimi")) return "Moonshot";
  if (modelId.startsWith("MiniMax")) return "MiniMax";
  if (modelId.startsWith("Mistral")) return "Mistral";
  if (modelId.startsWith("GLM")) return "Zhipu";
  if (modelId.startsWith("Step")) return "StepFun";
  if (modelId.startsWith("Devstral")) return "Mistral";
  return "Other";
}

export default function AIRouter() {
  const { data: models = [], isLoading, refetch } = trpc.chat.nexosModels.useQuery();
  const sendMutation = trpc.chat.send.useMutation();

  const [selectedModel, setSelectedModel] = useState<string>("");
  const [testPrompt, setTestPrompt] = useState("Hello! What model are you and who made you? Answer in one sentence.");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Group models by provider
  const grouped = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const m of models) {
      const provider = getProviderName(m.id);
      if (!map[provider]) map[provider] = [];
      map[provider].push(m.id);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [models]);

  const activeModel = selectedModel || models[0]?.id || "";

  async function runTest() {
    if (!activeModel) return;
    setIsTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await sendMutation.mutateAsync({
        sessionId: `ai-router-test-${Date.now()}`,
        message: testPrompt,
        model: activeModel,
        provider: "nexos",
      });
      setTestResult(res.content);
      toast.success(`Response from ${activeModel}`);
    } catch (err: any) {
      setTestError(err?.message ?? "Request failed");
      toast.error("Test failed");
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--iv-blue)" }}>
            Hostinger AI Router
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--iv-muted)" }}>
            Powered by nexos.ai — GPT, Claude, Gemini, Grok and more through one API key
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-400 border-green-400/40 bg-green-400/10">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 inline-block animate-pulse" />
            Connected
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card style={{ backgroundColor: "var(--iv-card)", borderColor: "var(--iv-border)" }}>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs font-medium mb-1" style={{ color: "var(--iv-muted)" }}>AVAILABLE MODELS</div>
            <div className="text-3xl font-bold" style={{ color: "var(--iv-blue)" }}>
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : models.length}
            </div>
          </CardContent>
        </Card>
        <Card style={{ backgroundColor: "var(--iv-card)", borderColor: "var(--iv-border)" }}>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs font-medium mb-1" style={{ color: "var(--iv-muted)" }}>PROVIDERS</div>
            <div className="text-3xl font-bold" style={{ color: "var(--iv-blue)" }}>
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : grouped.length}
            </div>
          </CardContent>
        </Card>
        <Card style={{ backgroundColor: "var(--iv-card)", borderColor: "var(--iv-border)" }}>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs font-medium mb-1" style={{ color: "var(--iv-muted)" }}>ENDPOINT</div>
            <div className="text-sm font-mono truncate" style={{ color: "var(--iv-blue)" }}>
              api.nexos.ai/v1
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model list */}
        <Card style={{ backgroundColor: "var(--iv-card)", borderColor: "var(--iv-border)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base" style={{ color: "var(--iv-text)" }}>Available Models</CardTitle>
            <CardDescription style={{ color: "var(--iv-muted)" }}>
              All models accessible via your Hostinger AI Router key
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--iv-blue)" }} />
              </div>
            ) : (
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {grouped.map(([provider, modelIds]) => (
                  <div key={provider}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--iv-muted)" }}>
                      {provider}
                    </div>
                    <div className="space-y-1">
                      {modelIds.map(id => (
                        <button
                          key={id}
                          onClick={() => setSelectedModel(id)}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2"
                          style={{
                            backgroundColor: activeModel === id ? "var(--iv-blue-dim)" : "transparent",
                            color: "var(--iv-text)",
                            border: activeModel === id ? "1px solid var(--iv-blue)" : "1px solid transparent",
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getProviderColor(id) }}
                          />
                          {id}
                          {activeModel === id && (
                            <CheckCircle2 className="w-3.5 h-3.5 ml-auto" style={{ color: "var(--iv-blue)" }} />
                          )}
                        </button>
                      ))}
                    </div>
                    <Separator className="mt-3" style={{ backgroundColor: "var(--iv-border)" }} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test playground */}
        <Card style={{ backgroundColor: "var(--iv-card)", borderColor: "var(--iv-border)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base" style={{ color: "var(--iv-text)" }}>Test Playground</CardTitle>
            <CardDescription style={{ color: "var(--iv-muted)" }}>
              Send a live request to any model via nexos.ai
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Model selector */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--iv-muted)" }}>
                Selected Model
              </label>
              <Select value={activeModel} onValueChange={setSelectedModel}>
                <SelectTrigger style={{ backgroundColor: "var(--iv-bg)", borderColor: "var(--iv-border)", color: "var(--iv-text)" }}>
                  <SelectValue placeholder="Choose a model..." />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: "var(--iv-card)", borderColor: "var(--iv-border)" }}>
                  {models.map(m => (
                    <SelectItem key={m.id} value={m.id} style={{ color: "var(--iv-text)" }}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getProviderColor(m.id) }} />
                        {m.id}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prompt */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--iv-muted)" }}>
                Prompt
              </label>
              <Textarea
                value={testPrompt}
                onChange={e => setTestPrompt(e.target.value)}
                rows={3}
                className="resize-none text-sm"
                style={{ backgroundColor: "var(--iv-bg)", borderColor: "var(--iv-border)", color: "var(--iv-text)" }}
              />
            </div>

            <Button
              onClick={runTest}
              disabled={isTesting || !activeModel}
              className="w-full"
              style={{ backgroundColor: "var(--iv-blue)", color: "var(--iv-navy)" }}
            >
              {isTesting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Send to {activeModel || "model"}</>
              )}
            </Button>

            {/* Result */}
            {testResult && (
              <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: "var(--iv-bg)", borderColor: "var(--iv-border)", border: "1px solid" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs font-medium text-green-400">Response</span>
                </div>
                <p style={{ color: "var(--iv-text)" }} className="whitespace-pre-wrap leading-relaxed">
                  {testResult}
                </p>
              </div>
            )}
            {testError && (
              <div className="rounded-lg p-3 text-sm border border-red-500/30" style={{ backgroundColor: "rgba(239,68,68,0.08)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs font-medium text-red-400">Error</span>
                </div>
                <p className="text-red-300 text-xs">{testError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Integration info */}
      <Card style={{ backgroundColor: "var(--iv-card)", borderColor: "var(--iv-border)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2" style={{ color: "var(--iv-text)" }}>
            <Zap className="w-4 h-4" style={{ color: "var(--iv-blue)" }} />
            Integration Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: "var(--iv-muted)" }}>BASE URL</div>
              <code className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "var(--iv-bg)", color: "var(--iv-blue)" }}>
                https://api.nexos.ai/v1
              </code>
            </div>
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: "var(--iv-muted)" }}>PROTOCOL</div>
              <span style={{ color: "var(--iv-text)" }}>OpenAI-compatible Chat Completions</span>
            </div>
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: "var(--iv-muted)" }}>BILLING</div>
              <span style={{ color: "var(--iv-text)" }}>Hostinger AI Router credits (hPanel)</span>
            </div>
          </div>
          <Separator className="my-3" style={{ backgroundColor: "var(--iv-border)" }} />
          <p className="text-xs" style={{ color: "var(--iv-muted)" }}>
            To use nexos.ai in any procedure, pass <code className="px-1 rounded" style={{ backgroundColor: "var(--iv-bg)" }}>provider: "nexos"</code> to{" "}
            <code className="px-1 rounded" style={{ backgroundColor: "var(--iv-bg)" }}>invokeLLM()</code>. The model name must match one of the IDs listed above.
            Credits are managed in hPanel → Dev Tools → AI Router.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
