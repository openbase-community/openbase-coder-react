import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import {
  CalendarClock,
  CheckCircle2,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

type Routine = {
  name: string;
  prompt: string;
  time: string;
  timezone?: string | null;
  enabled: boolean;
  targetName?: string | null;
  threadId?: string | null;
  cwd?: string | null;
  mode?: string | null;
  model?: string | null;
  reasoningEffort?: string | null;
  nextRunAt?: string | null;
  lastRunDate?: string | null;
  lastStartedAt?: string | null;
  lastThreadId?: string | null;
  lastTurnId?: string | null;
  lastStatus?: string | null;
  lastError?: string | null;
  updatedAt?: string | null;
};

type RoutinesResponse = {
  count: number;
  routines: Routine[];
};

const defaultForm = {
  name: "",
  prompt: "",
  time: "09:00",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  targetName: "",
  threadId: "",
  cwd: "",
  mode: "default",
};

function formatDateTime(value?: string | null): string {
  if (!value) return "not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function extractError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.error || body.detail || fallback;
}

const Routines = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/routines/");
      if (!res.ok) {
        throw new Error(await extractError(res, "Unable to load routines."));
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
        prompt: form.prompt,
        time: form.time,
        timezone: form.timezone,
        targetName: form.targetName,
        threadId: form.threadId,
        cwd: form.cwd,
        mode: form.mode,
      };
      const res = await apiFetch("/api/routines/", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await extractError(res, "Unable to create routine."));
      }
      setForm(defaultForm);
      toast.success("Routine saved");
      void fetchRoutines();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create routine.");
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
        throw new Error(await extractError(res, "Unable to update routine."));
      }
      void fetchRoutines();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update routine.");
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
        throw new Error(await extractError(res, "Unable to run routines."));
      }
      const data = await res.json();
      toast.success(`Ran ${data.count ?? 0} routine${data.count === 1 ? "" : "s"}`);
      void fetchRoutines();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to run routines.");
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
        throw new Error(await extractError(res, "Unable to delete routine."));
      }
      setRoutines((prev) => prev.filter((item) => item.name !== routine.name));
      toast.success("Routine deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete routine.");
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
              Routines
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {routines.length} configured · local Super Agents state
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <Button
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              onClick={() => void runDue()}
              disabled={actionKey !== null}
            >
              <Play className="h-3 w-3" />
              Run due
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {error}
          </div>
        ) : null}

        <form
          onSubmit={(event) => void createRoutine(event)}
          className="grid gap-3 rounded border border-border bg-surface p-3 md:grid-cols-6"
        >
          <label className="min-w-0 md:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Name
            </span>
            <input
              className="mt-1 h-8 w-full rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-info"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Time
            </span>
            <input
              className="mt-1 h-8 w-full rounded border border-border bg-background px-2 font-mono text-[12px] outline-none focus:border-info"
              value={form.time}
              onChange={(event) => setForm({ ...form, time: event.target.value })}
              pattern="[0-2][0-9]:[0-5][0-9]"
              required
            />
          </label>
          <label className="min-w-0 md:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Timezone
            </span>
            <input
              className="mt-1 h-8 w-full rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-info"
              value={form.timezone}
              onChange={(event) => setForm({ ...form, timezone: event.target.value })}
            />
          </label>
          <label className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Mode
            </span>
            <select
              className="mt-1 h-8 w-full rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-info"
              value={form.mode}
              onChange={(event) => setForm({ ...form, mode: event.target.value })}
            >
              <option value="default">default</option>
              <option value="plan">plan</option>
            </select>
          </label>
          <label className="min-w-0 md:col-span-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Target thread name
            </span>
            <input
              className="mt-1 h-8 w-full rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-info"
              value={form.targetName}
              onChange={(event) => setForm({ ...form, targetName: event.target.value })}
            />
          </label>
          <label className="min-w-0 md:col-span-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Thread ID
            </span>
            <input
              className="mt-1 h-8 w-full rounded border border-border bg-background px-2 font-mono text-[12px] outline-none focus:border-info"
              value={form.threadId}
              onChange={(event) => setForm({ ...form, threadId: event.target.value })}
            />
          </label>
          <label className="min-w-0 md:col-span-6">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cwd
            </span>
            <input
              className="mt-1 h-8 w-full rounded border border-border bg-background px-2 font-mono text-[12px] outline-none focus:border-info"
              value={form.cwd}
              onChange={(event) => setForm({ ...form, cwd: event.target.value })}
            />
          </label>
          <label className="min-w-0 md:col-span-6">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Prompt
            </span>
            <textarea
              className="mt-1 min-h-20 w-full resize-y rounded border border-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-info"
              value={form.prompt}
              onChange={(event) => setForm({ ...form, prompt: event.target.value })}
              required
            />
          </label>
          <div className="md:col-span-6">
            <Button
              type="submit"
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              disabled={submitting}
            >
              <Plus className="h-3 w-3" />
              Save routine
            </Button>
          </div>
        </form>

        {loading && sortedRoutines.length === 0 ? (
          <div className="text-[12px] text-muted-foreground">Loading...</div>
        ) : sortedRoutines.length === 0 ? (
          <div className="rounded border border-dashed border-border bg-surface px-4 py-8 text-center">
            <CalendarClock className="mx-auto h-4 w-4 text-muted-foreground/40" />
            <p className="mt-2 text-[12px] text-muted-foreground">
              No routines configured.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-border bg-surface">
            {sortedRoutines.map((routine, idx) => (
              <div
                key={routine.name}
                className={`grid gap-3 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_auto] ${
                  idx > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0 text-info" />
                    <span className="truncate text-[12.5px] font-medium text-foreground">
                      {routine.name}
                    </span>
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
                      {routine.time} {routine.timezone ?? ""}
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
                    {routine.mode ? <span>mode {routine.mode}</span> : null}
                    {routine.reasoningEffort ? <span>effort {routine.reasoningEffort}</span> : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-[12px] text-muted-foreground">
                    {routine.prompt}
                  </p>
                  {routine.lastError ? (
                    <p className="mt-2 rounded border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
                      {routine.lastError}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-start gap-2 lg:justify-end">
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
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Routines;
