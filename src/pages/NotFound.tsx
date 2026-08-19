import { OpenbaseWordmark } from "@/components/OpenbaseWordmark";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Compass } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="ob-app-shell flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <OpenbaseWordmark className="mx-auto h-6" />
        <div className="mt-7 rounded-xl border border-border bg-surface px-8 py-9 shadow-sm">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Compass className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <p className="mt-5 font-mono text-[11px] font-medium text-primary">
            404
          </p>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
            This view isn’t available
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            <code className="font-mono">{location.pathname}</code> does not match
            an Openbase page.
          </p>
          <Button className="mt-6" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
