import React from "react";
import { formatAgo } from "./syncHealth";
import type { SyncDaemonPeer, SyncOverview } from "./syncTypes";

/**
 * The other computers: on the hub, every edge that is (or was) connected; on
 * an edge, whether the hub is reachable.
 */
export const SyncComputers: React.FC<{
  role: string | undefined;
  peers: SyncDaemonPeer[];
  overview: SyncOverview | null;
  hubLabel: string | null;
  peerName: (device: string) => string;
  now?: number;
}> = ({ role, peers, overview, hubLabel, peerName, now = Date.now() }) => {
  const offline = overview?.offline_peers ?? [];
  const isHub = role === "hub";
  return (
    <div className="space-y-1">
      <div className="text-sm text-muted-foreground">
        {isHub ? "Computers syncing with this one" : "Always-on computer"}
      </div>
      <ul className="space-y-1">
        {peers.map((peer) => {
          const since = formatAgo(peer.connected_at, now);
          return (
            <li key={peer.device} className="text-xs">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-success" />
              <span className="font-mono">{peerName(peer.device)}</span>{" "}
              <span className="text-muted-foreground">
                connected{since ? ` ${since}` : ""}
                {peer.rtt_ms > 0 ? ` · ${peer.rtt_ms.toFixed(0)} ms round trip` : ""}
              </span>
            </li>
          );
        })}
        {offline.map((peer) => {
          const seen = formatAgo(peer.last_seen, now);
          return (
            <li key={peer.device} className="text-xs">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-muted-foreground/50" />
              <span className="font-mono">{peerName(peer.device)}</span>{" "}
              <span className="text-muted-foreground">
                not connected{seen ? ` · last seen ${seen}` : ""}
              </span>
            </li>
          );
        })}
        {peers.length === 0 && offline.length === 0 ? (
          <li className="text-xs text-muted-foreground">
            {isHub
              ? "none connected right now"
              : `${hubLabel ?? "The always-on computer"} is not connected`}
          </li>
        ) : null}
      </ul>
    </div>
  );
};
