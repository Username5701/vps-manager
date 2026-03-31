import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Loader2, Eye, EyeOff, ChevronDown, ChevronUp, Terminal } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError(null);
    const result = await login(key.trim());
    setLoading(false);
    if (!result.ok) setError(result.error ?? "Authentication failed");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#08090d" }}>
      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(110,92,255,.18) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: "linear-gradient(135deg,#6e5cff,#0ff4c6)", padding: 2 }}>
            <div className="w-full h-full rounded-2xl flex items-center justify-center"
              style={{ background: "#08090d" }}>
              <span className="text-2xl font-black brand-gradient">X</span>
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-1">
            <span className="brand-gradient">XCASPER</span>{" "}
            <span className="text-foreground">MANAGER</span>
          </h1>
          <p className="text-sm text-muted-foreground">Enter your API key to continue</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "#0f1117",
            border: "1px solid rgba(110,92,255,.22)",
            boxShadow: "0 0 60px rgba(110,92,255,.12)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wider uppercase" style={{ color: "#0ff4c6" }}>
                API Key
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showKey ? "text" : "password"}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="sk-••••••••••••••••"
                  autoFocus
                  autoComplete="current-password"
                  className="pl-9 pr-10 font-mono text-sm"
                  style={{
                    background: "#161a25",
                    borderColor: error ? "rgba(239,68,68,.6)" : "rgba(110,92,255,.28)",
                    color: "#e8e8f0",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !key.trim()}
              className="w-full h-10 font-semibold text-sm tracking-wide"
              style={{
                background: "linear-gradient(135deg,#6e5cff,#0ff4c6)",
                color: "#08090d",
                border: "none",
                opacity: loading || !key.trim() ? 0.6 : 1,
              }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </div>

        {/* .env setup hint */}
        <div className="mt-5 w-full max-w-sm">
          <button
            onClick={() => setShowSetup((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            style={{ background: "rgba(110,92,255,.07)", border: "1px solid rgba(110,92,255,.18)" }}
          >
            <span className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" style={{ color: "#0ff4c6" }} />
              Deploying? Configure your keys via <code className="font-mono">.env</code>
            </span>
            {showSetup ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showSetup && (
            <div className="mt-2 rounded-xl p-4 text-xs font-mono"
              style={{ background: "rgba(8,9,13,.9)", border: "1px solid rgba(110,92,255,.2)" }}>
              <p className="text-muted-foreground mb-2 font-sans">Create a <span className="text-[#0ff4c6]">.env</span> file in your project root:</p>
              <pre className="leading-6 text-[#a8a0ff] whitespace-pre-wrap">{`# Required — your API access key
API_KEY=your-secret-key-here

# Required — session encryption secret
SESSION_SECRET=any-random-string`}</pre>
              <p className="text-muted-foreground font-sans mt-3 text-[11px]">
                The <span className="text-[#0ff4c6]">API_KEY</span> value is what you enter above to sign in.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          XCASPER MANAGER — We believe in building together
        </p>
      </div>
    </div>
  );
}
