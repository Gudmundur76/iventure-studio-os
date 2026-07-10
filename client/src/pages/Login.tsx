import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Terminal, Lock } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = setupMode ? "/api/auth/setup" : "/api/auth/login";
      const body = setupMode ? { password } : { username, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed");
        return;
      }
      window.location.href = "/os";
    } catch {
      setError("Network error — check connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--iv-navy)" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--iv-blue-dim)", border: "1px solid var(--iv-blue)" }}>
            <Terminal className="w-5 h-5" style={{ color: "var(--iv-green)" }} />
          </div>
          <div>
            <div className="font-bold text-lg leading-tight" style={{ color: "var(--iv-text)" }}>iVenture</div>
            <div className="text-xs font-mono" style={{ color: "var(--iv-green)" }}>Studio OS</div>
          </div>
        </div>

        <Card style={{ backgroundColor: "var(--iv-surface)", border: "1px solid var(--iv-border)" }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: "var(--iv-text)" }}>
              <Lock className="w-4 h-4" style={{ color: "var(--iv-green)" }} />
              {setupMode ? "First-time Setup" : "Sign In"}
            </CardTitle>
            <CardDescription className="text-xs" style={{ color: "var(--iv-text-muted)" }}>
              {setupMode
                ? "Create your admin password to get started"
                : "Access your iVenture Studio OS"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!setupMode && (
                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: "var(--iv-text-muted)" }}>Username</Label>
                  <Input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="admin"
                    className="text-sm"
                    style={{ backgroundColor: "var(--iv-navy)", border: "1px solid var(--iv-border)", color: "var(--iv-text)" }}
                    autoFocus
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs" style={{ color: "var(--iv-text-muted)" }}>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="text-sm"
                  style={{ backgroundColor: "var(--iv-navy)", border: "1px solid var(--iv-border)", color: "var(--iv-text)" }}
                  autoFocus={setupMode}
                />
              </div>
              {error && (
                <p className="text-red-400 text-xs font-mono">{error}</p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full font-semibold"
                style={{ backgroundColor: "var(--iv-green)", color: "var(--iv-navy)" }}
              >
                {loading ? "..." : setupMode ? "Create Account" : "Sign In"}
              </Button>
            </form>
            <button
              onClick={() => { setSetupMode(!setupMode); setError(""); }}
              className="mt-4 text-xs w-full text-center transition-colors"
              style={{ color: "var(--iv-text-muted)" }}
            >
              {setupMode ? "Already have an account? Sign in" : "First time? Run setup"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
