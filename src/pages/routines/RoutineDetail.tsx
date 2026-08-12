import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Panel } from "@/components/ui/panel";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, Play, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  DetailField,
  extractError,
  fieldLabelClass,
  formatDateTime,
  loopBodyText,
  scheduleLabel,
} from "./helpers";
import type { Routine, RoutineResponse } from "./types";

export const RoutineDetail = () => {
  const { loopName } = useParams();
  const navigate = useNavigate();
  const name = loopName ?? "";
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutine = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/routines/${encodeURIComponent(name)}/`);
      if (!res.ok) {
        throw new Error(await extractError(res, "Unable to load loop."));
      }
      const data = (await res.json()) as RoutineResponse;
      setRoutine(data.routine);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reach the local API.");
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    if (!name) {
      setLoading(false);
      setError("Loop name is missing.");
      return;
    }
    void fetchRoutine();
  }, [fetchRoutine, name]);

  const patchRoutine = async (patch: Partial<Routine>) => {
    if (!routine) return;
    setActionKey("patch");
    try {
      const res = await apiFetch(`/api/routines/${encodeURIComponent(routine.name)}/`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        throw new Error(await extractError(res, "Unable to update loop."));
      }
      toast.success("Loop updated");
      void fetchRoutine();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update loop.");
    } finally {
      setActionKey(null);
    }
  };

  const runRoutine = async () => {
    if (!routine) return;
    setActionKey("run");
    try {
      const res = await apiFetch("/api/routines/run-due/", {
        method: "POST",
        body: JSON.stringify({ name: routine.name, force: true }),
      });
      if (!res.ok) {
        throw new Error(await extractError(res, "Unable to run loop."));
      }
      const data = await res.json();
      toast.success(`Ran ${data.count ?? 0} loop${data.count === 1 ? "" : "s"}`);
      void fetchRoutine();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to run loop.");
    } finally {
      setActionKey(null);
    }
  };

  const deleteRoutine = async () => {
    if (!routine) return;
    setActionKey("delete");
    try {
      const res = await apiFetch(`/api/routines/${encodeURIComponent(routine.name)}/`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(await extractError(res, "Unable to delete loop."));
      }
      toast.success("Loop deleted");
      navigate("/dashboard/loops");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete loop.");
    } finally {
      setActionKey(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 mb-1 h-7 px-2 text-[12px]"
            >
              <Link to="/dashboard/loops">
                <ArrowLeft className="h-3 w-3" />
                Loops
              </Link>
            </Button>
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
              {routine?.name ?? name}
            </h1>
            {routine ? (
              <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">
                {routine.kind ?? "agent"} · {scheduleLabel(routine)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              onClick={() => void fetchRoutine()}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {routine ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[12px]"
                  disabled={actionKey !== null}
                  onClick={() => void patchRoutine({ enabled: !routine.enabled })}
                >
                  {routine.enabled ? "Disable" : "Enable"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[12px]"
                  disabled={actionKey !== null}
                  onClick={() => void runRoutine()}
                >
                  <Play className="h-3 w-3" />
                  Run
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[12px]"
                  disabled={actionKey !== null}
                  onClick={() => void deleteRoutine()}
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {error ? (
          <ErrorBanner>
            {error}
          </ErrorBanner>
        ) : null}

        {loading && !routine ? (
          <div className="text-[12px] text-muted-foreground">Loading...</div>
        ) : routine ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="min-w-0 space-y-3">
              <div className="rounded border border-border bg-surface">
                <div className="border-b border-border px-3 py-2">
                  <div className={fieldLabelClass}>
                    {routine.kind === "command" ? "Command" : "Prompt"}
                  </div>
                </div>
                <pre className="max-h-[34rem] overflow-auto whitespace-pre-wrap break-words px-3 py-3 font-mono text-[12px] leading-5 text-foreground">
                  {loopBodyText(routine) || "not set"}
                </pre>
              </div>

              {routine.kind === "command" && routine.prompt ? (
                <div className="rounded border border-border bg-surface">
                  <div className="border-b border-border px-3 py-2">
                    <div className={fieldLabelClass}>Agent handoff prompt</div>
                  </div>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words px-3 py-3 font-mono text-[12px] leading-5 text-foreground">
                    {routine.prompt}
                  </pre>
                </div>
              ) : null}

              {routine.lastError ? (
                <ErrorBanner>
                  {routine.lastError}
                </ErrorBanner>
              ) : null}
            </section>

            <Panel className="min-w-0">
                <DetailField label="Status">
                  {routine.enabled ? "enabled" : "disabled"}
                </DetailField>
                <DetailField label="Kind">{routine.kind ?? "agent"}</DetailField>
                <DetailField label="Schedule">{scheduleLabel(routine)}</DetailField>
                <DetailField label="Next run">
                  {formatDateTime(routine.nextRunAt)}
                </DetailField>
                <DetailField label="Last status">
                  {routine.lastStatus ?? "never"}
                </DetailField>
                <DetailField label="Last started">
                  {formatDateTime(routine.lastStartedAt)}
                </DetailField>
                <DetailField label="Last run at">
                  {formatDateTime(routine.lastRunAt)}
                </DetailField>
                <DetailField label="Last run date">
                  {routine.lastRunDate ?? ""}
                </DetailField>
                <DetailField label="Target name">
                  {routine.targetName ?? ""}
                </DetailField>
                <DetailField label="Thread ID">
                  {routine.threadId ? (
                    <Link
                      to={`/dashboard/threads/${encodeURIComponent(routine.threadId)}`}
                      className="text-info hover:underline"
                    >
                      {routine.threadId}
                    </Link>
                  ) : (
                    ""
                  )}
                </DetailField>
                <DetailField label="Last thread ID">
                  {routine.lastThreadId ? (
                    <Link
                      to={`/dashboard/threads/${encodeURIComponent(routine.lastThreadId)}`}
                      className="text-info hover:underline"
                    >
                      {routine.lastThreadId}
                    </Link>
                  ) : (
                    ""
                  )}
                </DetailField>
                <DetailField label="Last turn ID">
                  {routine.lastTurnId ?? ""}
                </DetailField>
                <DetailField label="Cwd">{routine.cwd ?? ""}</DetailField>
                <DetailField label="Mode">{routine.mode ?? ""}</DetailField>
                <DetailField label="Model">{routine.model ?? ""}</DetailField>
                <DetailField label="Reasoning effort">
                  {routine.reasoningEffort ?? ""}
                </DetailField>
                <DetailField label="Fresh thread per run">
                  {routine.freshThreadPerRun ? "true" : "false"}
                </DetailField>
                <DetailField label="Updated">
                  {formatDateTime(routine.updatedAt)}
                </DetailField>
            </Panel>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default RoutineDetail;
