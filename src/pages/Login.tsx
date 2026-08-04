import { Button } from "@/components/ui/button";
import { OpenbaseWordmark } from "@/components/OpenbaseWordmark";
import { useAuth } from "@/contexts/auth";
import { getRuntimeShell } from "@/lib/runtime-config";
import { ArrowRight, CheckCircle2, Terminal } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Login() {
  const { refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isDesktop = getRuntimeShell() === "electron";

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

  if (isDesktop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent px-6 py-14" data-openbase-onboarding="true">
        <div className="w-full max-w-md">
          <OpenbaseWordmark className="mx-auto h-[26px]" />
          <div className="mt-8 rounded-[22px] border border-white/80 bg-white/82 p-7 shadow-[0_30px_90px_-58px_rgba(24,73,139,.68),inset_0_1px_0_rgba(255,255,255,.95)] backdrop-blur-2xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-primary/[0.09] text-primary">
              <CheckCircle2 className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.04em] text-foreground">Connect your account</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Openbase uses the local CLI session on this Mac. Sign in there, then verify the connection here.
            </p>

            {message ? (
              <div className="mt-5 rounded-xl border border-destructive/15 bg-destructive/[0.06] px-4 py-3 text-sm text-destructive">{message}</div>
            ) : null}

            <div className="mt-6 rounded-xl border border-primary/10 bg-[#071a35] px-4 py-3 font-mono text-sm text-slate-100 shadow-inner">
              <span className="text-sky-300">$</span> openbase-coder login
            </div>

            <Button className="mt-5 h-11 w-full rounded-xl" disabled={isLoading} onClick={onContinue} type="button">
              {isLoading ? "Checking connection…" : "Verify connection"}
              {!isLoading ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Openbase on {window.location.host || "this Mac"}</p>
        </div>
      </div>
    );
  }

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
