import { Panel } from "@/components/ui/panel";
import {
  FolderSync,
  GitBranch,
  HardDrive,
  ListChecks,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
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

const Command: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
    {children}
  </code>
);

export const SyncExplainerCard: React.FC = () => (
  <Panel>
    <div className="flex flex-col gap-3 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <FolderSync className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-foreground">
            How Openbase Sync works
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Keeps the folders you choose identical across your computers, from
            code projects to documents and assets.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-2.5">
        <Bullet icon={<Server className="h-3.5 w-3.5" />}>
          One always-on computer is the hub (for example a Mac mini or a cloud
          DevSpace); your other computers are edges that mirror through it.
        </Bullet>
        <Bullet icon={<ShieldCheck className="h-3.5 w-3.5" />}>
          Files travel between your devices over Openbase VPN only.
        </Bullet>
        <Bullet icon={<GitBranch className="h-3.5 w-3.5" />}>
          Git state travels as git: commits, branches, and worktrees replicate
          through git itself, and .git directories are never file-synced.
        </Bullet>
        <Bullet icon={<ListChecks className="h-3.5 w-3.5" />}>
          Conflicts are kept as records you resolve here (keep mine or take
          theirs); nothing is silently overwritten.
        </Bullet>
        <Bullet icon={<HardDrive className="h-3.5 w-3.5" />}>
          Large files can stay on one side as placeholders until they are used;
          pinned paths are always held in full.
        </Bullet>
        <Bullet icon={<Sparkles className="h-3.5 w-3.5" />}>
          Thread sync and skills sync ride the same daemon once their folders
          are added as roots.
        </Bullet>
        <Bullet icon={<Smartphone className="h-3.5 w-3.5" />}>
          Phones view sync status and conflicts but never sync files.
        </Bullet>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border pt-2.5">
        <p className="text-[11.5px] text-foreground">Set up</p>
        <p className="text-[11px] text-muted-foreground">
          Run <Command>openbase-coder sync-daemon configure</Command> on each
          computer; add <Command>--with-product-folders</Command> to include
          thread sync and skills.
        </p>
        <p className="text-[11px] text-muted-foreground">
          Computers that used the previous sync engine: preview the move with{" "}
          <Command>openbase-coder sync migrate-from-syncthing</Command>, then
          run it again with <Command>--apply</Command>.
        </p>
      </div>
    </div>
  </Panel>
);
