export type LoopTriggerFilter = {
  path: string;
  op:
    | "equals"
    | "notEquals"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "exists"
    | "regex";
  value?: unknown;
};

export type LoopTrigger = {
  id: string;
  type?: string | null;
  enabled?: boolean | null;
  description?: string | null;
  token?: string | null;
  hmacHeader?: string | null;
  senderPath?: string | null;
  senderAllowlist?: string[] | null;
  filters?: LoopTriggerFilter[] | null;
  createdAt?: string | null;
  lastEventAt?: string | null;
  lastEventId?: string | null;
  eventCount?: number | null;
};

export type Routine = {
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
  triggers?: LoopTrigger[] | null;
  updatedAt?: string | null;
};

export type RoutinesResponse = {
  count: number;
  routines: Routine[];
};

export type RoutineResponse = {
  routine: Routine;
};

export type RoutineForm = {
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

export const defaultForm: RoutineForm = {
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
