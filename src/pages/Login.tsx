import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";
import { ArrowRight, Terminal } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Login() {
  const { refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onContinue = async () => {
    setIsLoading(true);
    try {
      await refreshAuth();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Unable to verify local login.";
      setMessage(description);
      toast.error("Unable to continue", { description });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-foreground text-background">
            <Terminal className="h-3 w-3" strokeWidth={2.25} />
          </div>
          <span className="font-mono text-[12px] font-medium text-foreground">
            openbase-coder
          </span>
        </div>

        <div className="rounded border border-border bg-surface p-5">
          <h1 className="text-sm font-semibold text-foreground">Sign in</h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Authentication is managed by the local CLI.
          </p>

          {message ? (
            <div className="mt-4 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
              {message}
            </div>
          ) : null}

          <div className="mt-4 rounded border border-border bg-background px-3 py-2 font-mono text-[12px] text-foreground/80">
            $ openbase-coder login
          </div>

          <Button
            type="button"
            onClick={onContinue}
            disabled={isLoading}
            size="sm"
            className="mt-4 h-8 w-full text-[12.5px]"
          >
            {isLoading ? "Checking…" : "I already logged in"}
            {!isLoading ? <ArrowRight className="h-3 w-3" /> : null}
          </Button>
        </div>

        <p className="mt-3 text-center font-mono text-[11px] text-muted-foreground">
          {window.location.host || "localhost"}
        </p>
      </div>
    </div>
  );
}
