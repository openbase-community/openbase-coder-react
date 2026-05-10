import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
