import { OpenbaseWordmark } from "@/components/OpenbaseWordmark";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { useAuth } from "@/contexts/auth";
import { ArrowRight, ShieldCheck } from "lucide-react";
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
    <div className="ob-app-shell flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <OpenbaseWordmark className="mx-auto h-6" />
        <div className="mt-7 rounded-xl border border-border bg-surface p-6 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <h1 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
            Open the authenticated console
          </h1>
          <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
            For security, a tab opened directly at localhost does not receive
            your local owner capability. Run this command in Terminal to open
            an authenticated tab.
          </p>

          {message ? <ErrorBanner className="mt-4">{message}</ErrorBanner> : null}

          <div className="mt-5 rounded-lg border border-border bg-foreground px-3 py-2.5 font-mono text-[12.5px] text-background">
            <span className="text-primary-foreground/60">$</span> openbase-coder
            auth open-console
          </div>

          <Button
            type="button"
            onClick={onContinue}
            disabled={isLoading}
            className="mt-5 w-full"
          >
            {isLoading ? "Checking connection…" : "Check this tab again"}
            {!isLoading ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
        </div>

        <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">
          {window.location.host || "localhost"}
        </p>
      </div>
    </div>
  );
}
