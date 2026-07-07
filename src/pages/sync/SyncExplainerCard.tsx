import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FolderSync,
  GitBranch,
  History,
  Info,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import React from "react";

const Bullet: React.FC<{
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, children }) => (
  <div className="flex items-start gap-2">
    <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
    <p className="text-[11.5px] text-muted-foreground">{children}</p>
  </div>
);

export const SyncExplainerCard: React.FC<{
  eligible: boolean;
  eligibleReason: string;
  enabling?: boolean;
  onEnable?: () => void;
}> = ({ eligible, eligibleReason, enabling, onEnable }) => (
  <div className="overflow-hidden rounded border border-border bg-surface">
    <div className="flex flex-col gap-3 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <FolderSync className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-foreground">
            Code sync
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Keeps the same directories identical across your computers — Macs
            and cloud workspaces — so you can pick up work anywhere.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-2.5">
        <Bullet icon={<ShieldCheck className="h-3.5 w-3.5" />}>
          Syncs files, including uncommitted changes and .env secrets, between
          your devices only — traffic never leaves your tailnet.
        </Bullet>
        <Bullet icon={<GitBranch className="h-3.5 w-3.5" />}>
          <span className="inline-flex items-center gap-1">
            Never syncs .git directories.
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 cursor-help text-muted-foreground/70" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[260px] text-[11px]">
                  Git history moves between your devices via git itself,
                  automatically. Only the working files are synced.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
        </Bullet>
        <Bullet icon={<History className="h-3.5 w-3.5" />}>
          Keeps 30 days of remote-change history, so you can undo changes that
          arrived from another device.
        </Bullet>
        <Bullet icon={<Smartphone className="h-3.5 w-3.5" />}>
          Phones can view your code but never sync it.
        </Bullet>
      </div>

      {eligible ? (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
          <p className="text-[11px] text-muted-foreground">
            Sync is available for this account but currently off. Enabling
            downloads the Syncthing engine (~15 MB).
          </p>
          <Button
            size="sm"
            className="h-8 px-3 text-[12px]"
            disabled={enabling}
            onClick={onEnable}
          >
            <FolderSync className="h-3 w-3" />
            {enabling ? "Enabling..." : "Enable sync"}
          </Button>
        </div>
      ) : (
        <div className="border-t border-border pt-2.5">
          <p className="text-[11.5px] text-foreground">
            {eligibleReason ||
              "Add a second computer to your account to enable sync."}
          </p>
        </div>
      )}
    </div>
  </div>
);
