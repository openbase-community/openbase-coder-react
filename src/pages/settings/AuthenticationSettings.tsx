import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";
import { LogOut } from "lucide-react";
import React from "react";

export const AuthenticationSettings: React.FC = () => {
  const { logout } = useAuth();

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Authentication
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Openbase bearer JWT, managed by the local CLI.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-[12px]"
          onClick={logout}
        >
          <LogOut className="h-3 w-3" />
          Log out
        </Button>
      </div>
    </div>
  );
};
