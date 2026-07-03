import DashboardLayout from "@/components/layouts/ExampleLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type ThreadSnapshotSummary = {
  fingerprint?: string | null;
  parent_fingerprint?: string | null;
  source_device_id?: string | null;
  source_device_name?: string | null;
  snapshot_path?: string | null;
  rollout_size?: number | null;
  exported_at?: number | null;
  updated_at_ms?: number | null;
  title?: string | null;
  cwd?: string | null;
  tokens_used?: number | null;
  rollout_path?: string | null;
};

type ThreadSyncConflict = {
  id?: string | null;
  source_type?: "home" | "device" | null;
  thread_id: string;
  title: string;
  cwd?: string | null;
  reason: string;
  detected_at?: number | null;
  source_device_id?: string | null;
  source_device_name?: string | null;
  local_fingerprint?: string | null;
  current_local_fingerprint?: string | null;
  incoming_fingerprint?: string | null;
  normal_fingerprint?: string | null;
  voice_fingerprint?: string | null;
  remote_label?: string | null;
  is_resolvable?: boolean | null;
  local?: ThreadSnapshotSummary | null;
  incoming_snapshot?: ThreadSnapshotSummary | null;
  latest_remote_snapshot?: ThreadSnapshotSummary | null;
  normal?: ThreadSnapshotSummary | null;
  voice?: ThreadSnapshotSummary | null;
};

type ThreadSyncConflictsPayload = {
  conflict_count: number;
  home_conflict_count?: number;
  device_conflict_count?: number;
  conflicts: ThreadSyncConflict[];
  exchange_dir?: string | null;
  home_ledger_path?: string | null;
};

const shortHash = (value?: string | null) =>
  value ? `${value.slice(0, 10)}…${value.slice(-6)}` : "none";

const formatBytes = (value?: number | null) => {
  if (!value) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const formatTimestamp = (seconds?: number | null, millis?: number | null) => {
  const value = millis ?? (seconds ? seconds * 1000 : null);
  return value ? new Date(value).toLocaleString() : "unknown";
};

const SnapshotColumn = ({
  icon,
  label,
  snapshot,
  fingerprint,
}: {
  icon: React.ReactNode;
  label: string;
  snapshot?: ThreadSnapshotSummary | null;
  fingerprint?: string | null;
}) => (
  <div className="min-w-0 rounded border border-border bg-surface px-3 py-2">
    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
      <div className="truncate">hash {shortHash(fingerprint ?? snapshot?.fingerprint)}</div>
      <div className="truncate">size {formatBytes(snapshot?.rollout_size)}</div>
      <div className="truncate">
        updated {formatTimestamp(snapshot?.exported_at, snapshot?.updated_at_ms)}
      </div>
      {snapshot?.tokens_used ? (
        <div className="truncate">tokens {snapshot.tokens_used.toLocaleString()}</div>
      ) : null}
    </div>
  </div>
);

const ThreadSyncConflicts = () => {
  const navigate = useNavigate();
  const [payload, setPayload] = useState<ThreadSyncConflictsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchConflicts = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await apiFetch("/api/settings/thread-sync/conflicts/");
      if (!res.ok) throw new Error("request_failed");
      setPayload(await res.json());
    } catch {
      toast.error("Failed to load sync conflicts");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void fetchConflicts();
  }, []);

  const resolveConflict = async (
    threadId: string,
    action: "accept_local" | "accept_remote_latest",
  ) => {
    setResolving(`${threadId}:${action}`);
    try {
      const res = await apiFetch(
        `/api/settings/thread-device-sync/conflicts/${encodeURIComponent(threadId)}/resolve/`,
        {
          method: "POST",
          body: JSON.stringify({ action }),
        },
      );
      if (!res.ok) throw new Error("request_failed");
      await fetchConflicts(false);
      toast.success("Conflict resolved");
    } catch {
      toast.error("Failed to resolve conflict");
    } finally {
      setResolving(null);
    }
  };

  const conflicts = payload?.conflicts ?? [];
  const homeConflictCount =
    payload?.home_conflict_count ??
    conflicts.filter((conflict) => conflict.source_type === "home").length;
  const deviceConflictCount =
    payload?.device_conflict_count ??
    conflicts.filter((conflict) => conflict.source_type !== "home").length;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => navigate("/dashboard/threads")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <h1 className="text-base font-semibold tracking-tight text-foreground">
                Sync conflicts
              </h1>
              {payload ? (
                <Badge variant={payload.conflict_count ? "destructive" : "secondary"}>
                  {payload.conflict_count}
                </Badge>
              ) : null}
            </div>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {payload
                ? `${homeConflictCount} homes · ${deviceConflictCount} devices`
                : "~/.openbase/thread-sync"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[12px]"
            disabled={loading}
            onClick={() => void fetchConflicts()}
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-[12px] text-muted-foreground">Loading…</div>
        ) : conflicts.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-surface px-4 py-8 text-center">
            <HardDrive className="mx-auto h-4 w-4 text-muted-foreground/40" />
            <p className="mt-2 text-[12px] text-muted-foreground">
              No sync conflicts.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conflicts.map((conflict) => {
              const sourceType = conflict.source_type ?? "device";
              const isHomeConflict = sourceType === "home";
              const remote = isHomeConflict
                ? conflict.normal
                : conflict.latest_remote_snapshot ?? conflict.incoming_snapshot;
              const local = isHomeConflict ? conflict.voice : conflict.local;
              const remoteLabel =
                conflict.remote_label ??
                conflict.source_device_name ??
                remote?.source_device_name ??
                conflict.source_device_id ??
                (isHomeConflict ? "Normal Codex home" : "remote");
              const localLabel = isHomeConflict ? "Voice home" : "Local";
              const remoteColumnLabel = isHomeConflict ? "Normal home" : "Remote";
              const sourceLabel = isHomeConflict ? "Homes" : "Devices";
              const canResolve = !isHomeConflict && conflict.is_resolvable !== false;
              const conflictKey =
                conflict.id ?? `${sourceType}:${conflict.thread_id}`;
              const localActionKey = `${conflictKey}:accept_local`;
              const remoteActionKey = `${conflictKey}:accept_remote_latest`;

              return (
                <div
                  key={conflictKey}
                  className="rounded border border-border bg-surface px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
                        <h2 className="truncate text-[13px] font-semibold text-foreground">
                          {conflict.title || conflict.thread_id}
                        </h2>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                        <Badge
                          variant={isHomeConflict ? "secondary" : "outline"}
                          className="h-5 px-1.5 font-sans text-[10px]"
                        >
                          {sourceLabel}
                        </Badge>
                        <span>{shortHash(conflict.thread_id)}</span>
                        <span>{conflict.reason}</span>
                        <span>{remoteLabel}</span>
                      </div>
                      {conflict.cwd ? (
                        <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground/80">
                          {conflict.cwd}
                        </div>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[12px]"
                      onClick={() =>
                        navigate(
                          `/dashboard/threads/${encodeURIComponent(conflict.thread_id)}`,
                        )
                      }
                    >
                      Open
                    </Button>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <SnapshotColumn
                      icon={<HardDrive className="h-3 w-3" />}
                      label={localLabel}
                      snapshot={local}
                      fingerprint={
                        conflict.current_local_fingerprint ??
                        conflict.local_fingerprint ??
                        conflict.voice_fingerprint
                      }
                    />
                    <SnapshotColumn
                      icon={<Download className="h-3 w-3" />}
                      label={remoteColumnLabel}
                      snapshot={remote}
                      fingerprint={
                        remote?.fingerprint ??
                        conflict.incoming_fingerprint ??
                        conflict.normal_fingerprint
                      }
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {canResolve ? (
                      <>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-[12px]"
                              disabled={Boolean(resolving)}
                            >
                              Keep local
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Keep local thread?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Remote snapshots from {remoteLabel} will be ignored for
                                this conflict.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                disabled={resolving === localActionKey}
                                onClick={() =>
                                  void resolveConflict(
                                    conflict.thread_id,
                                    "accept_local",
                                  )
                                }
                              >
                                Keep local
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-[12px]"
                              disabled={Boolean(resolving)}
                            >
                              Use remote latest
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Use remote latest?</AlertDialogTitle>
                              <AlertDialogDescription>
                                The local thread state will be overwritten with the
                                newest synced snapshot from {remoteLabel}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                disabled={resolving === remoteActionKey}
                                onClick={() =>
                                  void resolveConflict(
                                    conflict.thread_id,
                                    "accept_remote_latest",
                                  )
                                }
                              >
                                Use remote latest
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    ) : (
                      <div className="text-[11px] text-muted-foreground">
                        Resolve home conflicts with the Codex sync CLI.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ThreadSyncConflicts;
