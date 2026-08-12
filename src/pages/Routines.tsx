import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Panel } from "@/components/ui/panel";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Terminal,
} from "lucide-react";
import {
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

type Routine = {
  name: string;
  kind?: "agent" | "command" | null;
  prompt: string;
  command?: string | null;
  commandTimeoutSeconds?: number | null;
  time: string;
  scheduleType?: "daily" | "interval" | null;
  intervalSeconds?: number | null;
  timezone?: string | null;
  enabled: boolean;
  targetName?: string | null;
  threadId?: string | null;
  freshThreadPerRun?: boolean | null;
  cwd?: string | null;
  mode?: string | null;
  model?: string | null;
  reasoningEffort?: string | null;
  nextRunAt?: string | null;
  lastRunDate?: string | null;
  lastRunAt?: string | null;
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

type RoutineResponse = {
  routine: Routine;
};

type RoutineForm = {
  name: string;
  kind: "agent" | "command";
  prompt: string;
  command: string;
  commandTimeoutSeconds: string;
  scheduleType: "daily" | "interval";
  time: string;
  intervalSeconds: string;
  timezone: string;
  targetName: string;
  threadId: string;
  freshThreadPerRun: boolean;
  cwd: string;
  mode: string;
};

const defaultForm: RoutineForm = {
  name: "",
  kind: "agent",
  prompt: "",
  command: "",
  commandTimeoutSeconds: "300",
  scheduleType: "daily",
  time: "09:00",
  intervalSeconds: "60",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  targetName: "",
  threadId: "",
  freshThreadPerRun: false,
  cwd: "",
  mode: "default",
};

const fieldLabelClass =
  "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";

const fieldInputClass =
  "mt-1 h-8 w-full rounded border border-border bg-background px-2 text-[12px] outline-none focus:border-info";

const monoFieldInputClass = `${fieldInputClass} font-mono`;

type CreateRoutineDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: RoutineForm;
  setForm: Dispatch<SetStateAction<RoutineForm>>;
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
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

function scheduleLabel(routine: Routine): string {
  return routine.scheduleType === "interval"
    ? `every ${routine.intervalSeconds ?? 60}s`
    : `${routine.time} ${routine.timezone ?? ""}`.trim();
}

function loopBodyText(routine: Routine): string {
  return routine.kind === "command" ? routine.command || "" : routine.prompt;
}

async function extractError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.error || body.detail || fallback;
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 border-t border-border px-3 py-2 first:border-t-0">
      <div className={fieldLabelClass}>{label}</div>
      <div className="mt-1 min-w-0 break-words font-mono text-[12px] text-foreground">
        {children || <span className="text-muted-foreground">not set</span>}
      </div>
    </div>
  );
}

const CreateRoutineDialog = ({
  open,
  onOpenChange,
  form,
  setForm,
  submitting,
  onSubmit,
}: CreateRoutineDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[88vh] !w-[calc(100vw-2rem)] !max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:!max-w-[680px]">
      <DialogHeader className="border-b border-border px-5 py-4">
        <DialogTitle className="text-base">New loop</DialogTitle>
        <DialogDescription className="text-[12px]">
          Schedule an agent prompt or local command.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
        <div className="max-h-[calc(88vh-8.75rem)] overflow-y-auto px-5 py-4">
          <div className="space-y-5">
            <section className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
                <label className="min-w-0">
                  <span className={fieldLabelClass}>Name</span>
                  <input
                    className={fieldInputClass}
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    required
                    autoFocus
                  />
                </label>
                <label className="min-w-0">
                  <span className={fieldLabelClass}>Kind</span>
                  <select
                    className={fieldInputClass}
                    value={form.kind}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        kind: event.target.value as "agent" | "command",
                      })
                    }
                  >
                    <option value="agent">agent</option>
                    <option value="command">command</option>
                  </select>
                </label>
              </div>

              {form.kind === "command" ? (
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
                  <label className="min-w-0">
                    <span className={fieldLabelClass}>Command</span>
                    <input
                      className={monoFieldInputClass}
                      value={form.command}
                      onChange={(event) =>
                        setForm({ ...form, command: event.target.value })
                      }
                      required
                    />
                  </label>
                  <label className="min-w-0">
                    <span className={fieldLabelClass}>Timeout</span>
                    <input
                      type="number"
                      className={monoFieldInputClass}
                      value={form.commandTimeoutSeconds}
                      min={1}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          commandTimeoutSeconds: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              ) : null}

              <label className="block min-w-0">
                <span className={fieldLabelClass}>
                  {form.kind === "command" ? "Agent handoff prompt" : "Prompt"}
                </span>
                <textarea
                  className="mt-1 min-h-28 w-full resize-y rounded border border-border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-info"
                  value={form.prompt}
                  onChange={(event) =>
                    setForm({ ...form, prompt: event.target.value })
                  }
                  required={form.kind === "agent"}
                />
              </label>
            </section>

            <section className="space-y-3 border-t border-border pt-4">
              <div className="grid gap-3 sm:grid-cols-[9rem_8rem_minmax(0,1fr)]">
                <label className="min-w-0">
                  <span className={fieldLabelClass}>Schedule</span>
                  <select
                    className={fieldInputClass}
                    value={form.scheduleType}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        scheduleType: event.target.value as "daily" | "interval",
                      })
                    }
                  >
                    <option value="daily">daily</option>
                    <option value="interval">interval</option>
                  </select>
                </label>
                <label className="min-w-0">
                  <span className={fieldLabelClass}>
                    {form.scheduleType === "interval" ? "Seconds" : "Time"}
                  </span>
                  <input
                    type={form.scheduleType === "interval" ? "number" : "text"}
                    className={monoFieldInputClass}
                    value={
                      form.scheduleType === "interval"
                        ? form.intervalSeconds
                        : form.time
                    }
                    onChange={(event) =>
                      setForm(
                        form.scheduleType === "interval"
                          ? { ...form, intervalSeconds: event.target.value }
                          : { ...form, time: event.target.value },
                      )
                    }
                    min={form.scheduleType === "interval" ? 5 : undefined}
                    pattern={
                      form.scheduleType === "interval"
                        ? "[0-9]+"
                        : "[0-2][0-9]:[0-5][0-9]"
                    }
                    required
                  />
                </label>
                <label className="min-w-0">
                  <span className={fieldLabelClass}>Timezone</span>
                  <input
                    className={fieldInputClass}
                    value={form.timezone}
                    onChange={(event) =>
                      setForm({ ...form, timezone: event.target.value })
                    }
                  />
                </label>
              </div>
            </section>

            <section className="space-y-3 border-t border-border pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="min-w-0">
                  <span className={fieldLabelClass}>Target thread name</span>
                  <input
                    className={fieldInputClass}
                    value={form.targetName}
                    onChange={(event) =>
                      setForm({ ...form, targetName: event.target.value })
                    }
                  />
                </label>
                <label className="min-w-0">
                  <span className={fieldLabelClass}>Thread ID</span>
                  <input
                    className={monoFieldInputClass}
                    value={form.threadId}
                    onChange={(event) =>
                      setForm({ ...form, threadId: event.target.value })
                    }
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
                <label className="min-w-0">
                  <span className={fieldLabelClass}>Cwd</span>
                  <input
                    className={monoFieldInputClass}
                    value={form.cwd}
                    onChange={(event) =>
                      setForm({ ...form, cwd: event.target.value })
                    }
                  />
                </label>
                <label className="min-w-0">
                  <span className={fieldLabelClass}>Mode</span>
                  <select
                    className={fieldInputClass}
                    value={form.mode}
                    onChange={(event) =>
                      setForm({ ...form, mode: event.target.value })
                    }
                  >
                    <option value="default">default</option>
                    <option value="plan">plan</option>
                  </select>
                </label>
              </div>

              <label className="flex min-w-0 items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border bg-background"
                  checked={form.freshThreadPerRun}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      freshThreadPerRun: event.target.checked,
                    })
                  }
                />
                <span className="text-[12px] text-muted-foreground">
                  Fresh thread per run
                </span>
              </label>
            </section>
          </div>
        </div>

        <DialogFooter className="border-t border-border px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[12px]"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            className="h-7 px-2.5 text-[12px]"
            disabled={submitting}
          >
            <Plus className="h-3 w-3" />
            Save loop
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);

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

            <aside className="min-w-0 overflow-hidden rounded border border-border bg-surface">
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
            </aside>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default Routines;
