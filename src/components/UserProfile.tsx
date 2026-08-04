import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth";
import { getRuntimeShell } from "@/lib/runtime-config";
import { UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

const UserProfile = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const isDesktop = getRuntimeShell() === "electron";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={
            isDesktop
              ? "relative h-9 w-9 rounded-xl border border-border/60 bg-white/65 p-0 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,.85)] hover:bg-white hover:ring-0"
              : "relative h-6 w-6 rounded-full p-0 hover:ring-1 hover:ring-border"
          }
        >
          <Avatar className={isDesktop ? "h-8 w-8 rounded-[10px]" : "h-6 w-6"}>
            <AvatarFallback className={isDesktop ? "rounded-[10px] bg-primary/[0.08] text-primary" : "bg-foreground text-background text-[10px] font-medium"}>
              {isDesktop ? <UserRound className="h-4 w-4" strokeWidth={1.8} /> : "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-44 text-[13px]">
        <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfile;
