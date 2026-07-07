import { Cloud, Laptop, Monitor } from "lucide-react";
import React, { useMemo } from "react";
import {
  isPhonePeer,
  type SyncFolderStatus,
  type SyncPeer,
} from "./syncApi";

const kindIcon = (kind: string) => {
  const value = kind.toLowerCase();
  if (value.includes("cloud") || value.includes("workspace")) {
    return <Cloud className="h-3.5 w-3.5" />;
  }
  if (value.includes("mac") || value.includes("laptop")) {
    return <Laptop className="h-3.5 w-3.5" />;
  }
  return <Monitor className="h-3.5 w-3.5" />;
};

export const SyncPeersCard: React.FC<{
  peers: SyncPeer[];
  statusFolders: SyncFolderStatus[];
}> = ({ peers, statusFolders }) => {
  const computerPeers = peers.filter((peer) => !isPhonePeer(peer));
  const reportedDeviceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const folder of statusFolders) {
      for (const deviceId of Object.keys(folder.peer_completion)) {
        ids.add(deviceId);
      }
    }
    return ids;
  }, [statusFolders]);

  if (computerPeers.length === 0) return null;

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="border-b border-border px-3 py-2.5">
        <p className="text-[12.5px] font-medium text-foreground">Computers</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Devices participating in sync over your tailnet.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 px-3 py-2.5">
        {computerPeers.map((peer) => {
          const online = reportedDeviceIds.has(peer.syncthing_device_id);
          return (
            <div
              key={peer.syncthing_device_id}
              className="flex min-w-0 items-center gap-2 rounded border border-border bg-background px-2.5 py-1.5"
              title={peer.syncthing_device_id}
            >
              <span className="text-muted-foreground">
                {kindIcon(peer.kind)}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[12px] font-medium text-foreground">
                    {peer.name}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      online ? "bg-success" : "bg-muted-foreground/40"
                    }`}
                    title={online ? "Reporting sync progress" : "No sync data yet"}
                  />
                </div>
                <div className="truncate font-mono text-[10px] text-muted-foreground">
                  {peer.tailscale_magic_dns}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
