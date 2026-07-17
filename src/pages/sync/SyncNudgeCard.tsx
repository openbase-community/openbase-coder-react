import { apiFetch } from "@/lib/api";
import { FolderSync, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SyncSettingsResponse } from "./syncApi";

const DISMISS_KEY = "openbase-sync-nudge-dismissed";

/**
 * Dashboard nudge shown once a second computer joins the account: sync is
 * eligible but not yet enabled. Dismissable; never shown again after enable
 * or dismissal.
 */
export const SyncNudgeCard: React.FC = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(DISMISS_KEY) === "1") {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch("/api/sync/settings/");
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as SyncSettingsResponse;
        if (!cancelled && data.eligible && !data.enabled) {
          setVisible(true);
        }
      } catch {
        // Older CLI or offline: no nudge.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="flex w-full items-start gap-2 rounded border border-border bg-surface px-3 py-2">
      <FolderSync className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <button
        onClick={() => navigate("/dashboard/sync")}
        className="min-w-0 flex-1 text-left"
      >
        <p className="text-[12.5px] font-medium text-foreground">
          You have more than one computer — keep your filesystem in sync
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Sync selected directories between your machines over your tailnet,
          from code projects to documents and assets. Set it up in a minute.
        </p>
      </button>
      <button
        aria-label="Dismiss sync suggestion"
        onClick={() => {
          window.localStorage.setItem(DISMISS_KEY, "1");
          setVisible(false);
        }}
        className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
