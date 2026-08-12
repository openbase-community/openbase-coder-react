import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { type Dispatch, type FormEvent, type SetStateAction } from "react";

import { fieldInputClass, fieldLabelClass, monoFieldInputClass } from "./helpers";
import type { RoutineForm } from "./types";

type CreateRoutineDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: RoutineForm;
  setForm: Dispatch<SetStateAction<RoutineForm>>;
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export const CreateRoutineDialog = ({
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
