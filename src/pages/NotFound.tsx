import { Button } from "@/components/ui/button";
import { OpenbaseWordmark } from "@/components/OpenbaseWordmark";
import { getRuntimeShell } from "@/lib/runtime-config";
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

  if (getRuntimeShell() === "electron") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent px-6" data-openbase-onboarding="true">
        <div className="w-full max-w-md text-center">
          <OpenbaseWordmark className="mx-auto h-[24px]" />
          <div className="mt-8 rounded-[22px] border border-white/80 bg-white/82 px-8 py-10 shadow-[0_30px_90px_-58px_rgba(24,73,139,.68)] backdrop-blur-2xl">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary/[0.09] text-primary">
              <Compass className="h-5 w-5" />
            </span>
            <p className="mt-6 font-mono text-xs font-medium text-primary">404</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-foreground">This view isn’t available</h1>
            <p className="mt-2 text-sm text-muted-foreground"><code className="font-mono">{location.pathname}</code> does not match an Openbase page.</p>
            <Button className="mt-6 rounded-xl" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
              Back to workspace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <p className="mt-2 text-[13px] text-foreground">
          <code className="font-mono">{location.pathname}</code> not found.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-4 h-7 px-2.5 text-[12px]"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="h-3 w-3" />
          Dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
