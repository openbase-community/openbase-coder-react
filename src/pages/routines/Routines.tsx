import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Panel } from "@/components/ui/panel";
import { apiFetch } from "@/lib/api";
import {
  CalendarClock,
  CheckCircle2,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Terminal,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { CreateRoutineDialog } from "./CreateRoutineDialog";
import {
  extractError,
  formatDateTime,
  loopBodyText,
  scheduleLabel,
} from "./helpers";
import { defaultForm, type Routine, type RoutinesResponse } from "./types";

const Routines = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/routines/");
      if (!res.ok) {
        throw new Error(await extractError(res, "Unable to load loops."));
      }
      const data = (await res.json()) as RoutinesResponse;
      setRoutines(Array.isArray(data.routines) ? data.routines : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reach the local API.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchRoutines();
  }, [fetchRoutines]);

  const sortedRoutines = useMemo(
    () =>
      [...routines].sort((a, b) =>
        String(a.nextRunAt ?? a.name).localeCompare(String(b.nextRunAt ?? b.name)),
      ),
    [routines],
  );

  const createRoutine = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        name: form.name,
        kind: form.kind,
        prompt: form.prompt,
        command: form.kind === "command" ? form.command : undefined,
        commandTimeoutSeconds:
          form.kind === "command" ? Number(form.commandTimeoutSeconds) : undefined,
        scheduleType: form.scheduleType,
        time: form.time,
        intervalSeconds:
          form.scheduleType === "interval" ? Number(form.intervalSeconds) : undefined,
        timezone: form.timezone,
        targetName: form.targetName,
        threadId: form.threadId,
        freshThreadPerRun: form.freshThreadPerRun,
        cwd: form.cwd,
        mode: form.mode,
      };
      const res = await apiFetch("/api/routines/", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await extractError(res, "Unable to create loop."));
      }
      setForm(defaultForm);
      setCreateOpen(false);
      toast.success("Loop saved");
      void fetchRoutines();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create loop.");
    } finally {
      setSubmitting(false);
    }
  };

  const patchRoutine = async (routine: Routine, patch: Partial<Routine>) => {
    const key = `${routine.name}:patch`;
    setActionKey(key);
    try {
      const res = await apiFetch(`/api/routines/${encodeURIComponent(routine.name)}/`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        throw new Error(await extractError(res, "Unable to update loop."));
      }
      void fetchRoutines();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update loop.");
    } finally {
      setActionKey(null);
    }
  };

  const runDue = async (name?: string, force = false) => {
    const key = name ? `${name}:run` : "run-due";
    setActionKey(key);
    try {
      const res = await apiFetch("/api/routines/run-due/", {
        method: "POST",
        body: JSON.stringify({ name, force }),
      });
      if (!res.ok) {
        throw new Error(await extractError(res, "Unable to run loops."));
      }
      const data = await res.json();
      toast.success(`Ran ${data.count ?? 0} loop${data.count === 1 ? "" : "s"}`);
      void fetchRoutines();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to run loops.");
    } finally {
      setActionKey(null);
    }
  };

  const deleteRoutine = async (routine: Routine) => {
    const key = `${routine.name}:delete`;
    setActionKey(key);
    try {
      const res = await apiFetch(`/api/routines/${encodeURIComponent(routine.name)}/`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(await extractError(res, "Unable to delete loop."));
      }
      setRoutines((prev) => prev.filter((item) => item.name !== routine.name));
      toast.success("Loop deleted");
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
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Loops
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {routines.length} configured · local Super Agents state
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3 w-3" />
              New loop
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              onClick={() => void fetchRoutines()}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <CreateRoutineDialog
          open={createOpen}
          onOpenChange={(open) => {
            if (submitting) return;
            setCreateOpen(open);
            if (!open) {
              setForm(defaultForm);
            }
          }}
          form={form}
          setForm={setForm}
          submitting={submitting}
          onSubmit={(event) => void createRoutine(event)}
        />

        {error ? (
          <ErrorBanner>
            {error}
          </ErrorBanner>
        ) : null}

        {loading && sortedRoutines.length === 0 ? (
          <div className="text-[12px] text-muted-foreground">Loading...</div>
        ) : sortedRoutines.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-surface px-4 py-8 text-center">
            <CalendarClock className="mx-auto h-4 w-4 text-muted-foreground/40" />
            <p className="mt-2 text-[12px] text-muted-foreground">
              No loops configured.
            </p>
            <Button
              size="sm"
              className="mt-4 h-7 px-2.5 text-[12px]"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3 w-3" />
              New loop
            </Button>
          </div>
        ) : (
          <Panel>
            {sortedRoutines.map((routine, idx) => (
              <div
                key={routine.name}
                className={`grid gap-3 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_auto] ${
                  idx > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    {routine.kind === "command" ? (
                      <Terminal className="h-3.5 w-3.5 shrink-0 text-info" />
                    ) : (
                      <CalendarClock className="h-3.5 w-3.5 shrink-0 text-info" />
                    )}
                    <Link
                      to={`/dashboard/loops/${encodeURIComponent(routine.name)}`}
                      className="truncate text-[12.5px] font-medium text-foreground hover:text-info hover:underline"
                    >
                      {routine.name}
                    </Link>
                    {routine.enabled ? (
                      <span className="inline-flex h-5 items-center gap-1 rounded border border-success/30 px-1.5 text-[10.5px] text-success">
                        <CheckCircle2 className="h-3 w-3" />
                        enabled
                      </span>
                    ) : (
                      <span className="rounded border border-border px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                        disabled
                      </span>
                    )}
                    <span className="font-mono text-[10.5px] text-muted-foreground">
                      {routine.kind ?? "agent"}
                    </span>
                    <span className="font-mono text-[10.5px] text-muted-foreground">
                      {scheduleLabel(routine)}
                    </span>
                  </div>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] text-muted-foreground/75">
                    <span>next {formatDateTime(routine.nextRunAt)}</span>
                    <span>last {routine.lastStatus ?? "never"}</span>
                    {routine.threadId ? (
                      <Link
                        to={`/dashboard/threads/${encodeURIComponent(routine.threadId)}`}
                        className="truncate text-info hover:underline"
                      >
                        thread {routine.threadId}
                      </Link>
                    ) : null}
                    {routine.targetName ? <span>target {routine.targetName}</span> : null}
                    {routine.freshThreadPerRun ? <span>fresh thread per run</span> : null}
                    {routine.mode ? <span>mode {routine.mode}</span> : null}
                    {routine.reasoningEffort ? <span>effort {routine.reasoningEffort}</span> : null}
                  </div>
                  <p className="mt-2 line-clamp-2 font-mono text-[12px] text-muted-foreground">
                    {loopBodyText(routine)}
                  </p>
                  {routine.lastError ? (
                    <p className="mt-2 rounded border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
                      {routine.lastError}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-[12px]"
                  >
                    <Link to={`/dashboard/loops/${encodeURIComponent(routine.name)}`}>
                      Details
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-[12px]"
                    disabled={actionKey !== null}
                    onClick={() => void patchRoutine(routine, { enabled: !routine.enabled })}
                  >
                    {routine.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-[12px]"
                    disabled={actionKey !== null}
                    onClick={() =>
                      void patchRoutine(routine, {
                        freshThreadPerRun: !routine.freshThreadPerRun,
                      })
                    }
                  >
                    {routine.freshThreadPerRun ? "Reuse target" : "Fresh thread"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-[12px]"
                    disabled={actionKey !== null}
                    onClick={() => void runDue(routine.name, true)}
                  >
                    <Play className="h-3 w-3" />
                    Run
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-[12px]"
                    disabled={actionKey !== null}
                    onClick={() => void deleteRoutine(routine)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </Panel>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Routines;
