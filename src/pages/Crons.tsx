import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  Clock,
  Play,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

interface CronJobEntry {
  id: number;
  name: string;
  description: string;
  schedule_type: string;
  cron_expression: string;
  interval_seconds: number | null;
  graph_id: string;
  assistant_id: string;
  prompt: string;
  enabled: boolean;
  last_run_at: string | null;
  last_run_thread_id: string;
  last_run_status: string;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CronJobRunEntry {
  id: number;
  cronjob_id: number;
  thread_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_message: string;
}

const SCHEDULE_PRESETS = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day at midnight", value: "0 0 * * *" },
  { label: "Every day at 9am", value: "0 9 * * *" },
  { label: "Every week (Mon midnight)", value: "0 0 * * 1" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
    running: "bg-blue-100 text-blue-800",
    pending: "bg-gray-100 text-gray-800",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || colors.pending}`}
    >
      {status || "—"}
    </span>
  );
}

const Crons = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const editingId = searchParams.get("id") || "";

  const [cronjobs, setCronjobs] = useState<CronJobEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [form, setForm] = useState({
    name: "",
    description: "",
    schedule_type: "cron",
    cron_expression: "0 * * * *",
    interval_seconds: "",
    graph_id: "coder",
    assistant_id: "",
    prompt: "",
  });
  const [saving, setSaving] = useState(false);
  const [runs, setRuns] = useState<CronJobRunEntry[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  // Create dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const fetchCronjobs = useCallback(async () => {
    const res = await apiFetch("/api/cronjobs/");
    if (res.ok) {
      const data = await res.json();
      setCronjobs(data.cronjobs);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCronjobs();
  }, [fetchCronjobs]);

  // Load cron job detail when editing
  useEffect(() => {
    if (!editingId) return;
    apiFetch(`/api/cronjobs/${editingId}/`).then(async (res) => {
      if (res.ok) {
        const cj = await res.json();
        setForm({
          name: cj.name,
          description: cj.description,
          schedule_type: cj.schedule_type,
          cron_expression: cj.cron_expression,
          interval_seconds: cj.interval_seconds?.toString() || "",
          graph_id: cj.graph_id,
          assistant_id: cj.assistant_id,
          prompt: cj.prompt,
        });
      }
    });
    // Load runs
    setRunsLoading(true);
    apiFetch(`/api/cronjobs/${editingId}/runs/`).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs);
      }
      setRunsLoading(false);
    });
  }, [editingId]);

  const openCron = (id: number) => {
    setSearchParams({ id: id.toString() });
  };

  const backToList = () => {
    const params = new URLSearchParams();
    setSearchParams(params);
  };

  const createCron = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const res = await apiFetch("/api/cronjobs/", {
      method: "POST",
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      const cj = await res.json();
      setNewName("");
      setShowCreate(false);
      await fetchCronjobs();
      openCron(cj.id);
      toast.success(`Cron job '${trimmed}' created`);
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create cron job");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...form,
      interval_seconds: form.interval_seconds
        ? parseInt(form.interval_seconds, 10)
        : null,
    };
    const res = await apiFetch(`/api/cronjobs/${editingId}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Cron job saved");
      fetchCronjobs();
    } else {
      toast.error("Failed to save cron job");
    }
  };

  const handleDelete = async () => {
    const res = await apiFetch(`/api/cronjobs/${editingId}/`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Cron job deleted");
      backToList();
      fetchCronjobs();
    } else {
      toast.error("Failed to delete cron job");
    }
  };

  const handleToggle = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await apiFetch(`/api/cronjobs/${id}/toggle/`, {
      method: "POST",
    });
    if (res.ok) {
      fetchCronjobs();
    }
  };

  const handleRunNow = async () => {
    const res = await apiFetch(`/api/cronjobs/${editingId}/run/`, {
      method: "POST",
    });
    if (res.ok) {
      toast.success("Cron job triggered");
      // Refresh runs
      const runsRes = await apiFetch(`/api/cronjobs/${editingId}/runs/`);
      if (runsRes.ok) {
        const data = await runsRes.json();
        setRuns(data.runs);
      }
      fetchCronjobs();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to trigger cron job");
    }
  };

  // ---- Editor view ----
  if (editingId) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={backToList}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-3xl font-light">{form.name || "Cron Job"}</h1>
              <p className="text-gray-600 text-sm">ID: {editingId}</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Set up the schedule and prompt for this cron job
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Description
                </label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Schedule Type
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={
                      form.schedule_type === "cron" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setForm({ ...form, schedule_type: "cron" })
                    }
                  >
                    Cron
                  </Button>
                  <Button
                    variant={
                      form.schedule_type === "interval" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setForm({ ...form, schedule_type: "interval" })
                    }
                  >
                    Interval
                  </Button>
                </div>
              </div>

              {form.schedule_type === "cron" ? (
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Cron Expression
                  </label>
                  <Input
                    value={form.cron_expression}
                    onChange={(e) =>
                      setForm({ ...form, cron_expression: e.target.value })
                    }
                    placeholder="0 * * * *"
                    className="font-mono"
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {SCHEDULE_PRESETS.map((preset) => (
                      <Button
                        key={preset.value}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          setForm({ ...form, cron_expression: preset.value })
                        }
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Interval (seconds)
                  </label>
                  <Input
                    type="number"
                    value={form.interval_seconds}
                    onChange={(e) =>
                      setForm({ ...form, interval_seconds: e.target.value })
                    }
                    placeholder="3600"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Graph ID
                </label>
                <Input
                  value={form.graph_id}
                  onChange={(e) =>
                    setForm({ ...form, graph_id: e.target.value })
                  }
                  placeholder="coder"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Assistant ID (optional)
                </label>
                <Input
                  value={form.assistant_id}
                  onChange={(e) =>
                    setForm({ ...form, assistant_id: e.target.value })
                  }
                  placeholder="Leave blank for default"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Prompt</label>
                <Textarea
                  value={form.prompt}
                  onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                  placeholder="The message to send to the agent..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={handleRunNow}>
                  <Play className="h-4 w-4 mr-2" />
                  Run Now
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Run History */}
          <Card>
            <CardHeader>
              <CardTitle>Run History</CardTitle>
            </CardHeader>
            <CardContent>
              {runsLoading ? (
                <div className="text-gray-400">Loading...</div>
              ) : runs.length === 0 ? (
                <p className="text-gray-500 text-sm">No runs yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-4">Started</th>
                        <th className="pb-2 pr-4">Status</th>
                        <th className="pb-2 pr-4">Thread ID</th>
                        <th className="pb-2">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((run) => (
                        <tr key={run.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 text-gray-600">
                            {new Date(run.started_at).toLocaleString()}
                          </td>
                          <td className="py-2 pr-4">
                            <StatusBadge status={run.status} />
                          </td>
                          <td className="py-2 pr-4 font-mono text-xs text-gray-500">
                            {run.thread_id
                              ? run.thread_id.slice(0, 12) + "..."
                              : "—"}
                          </td>
                          <td className="py-2 text-gray-600">
                            {run.completed_at
                              ? new Date(run.completed_at).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ---- List view ----
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light mb-2">Cron Jobs</h1>
            <p className="text-gray-600">Scheduled agent runs</p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4 mr-1" />
            New Cron Job
          </Button>
        </div>

        {showCreate && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCron();
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Cron job name (e.g. daily-review)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
              autoFocus
            />
            <Button type="submit" disabled={!newName.trim()}>
              Create
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                setNewName("");
              }}
            >
              Cancel
            </Button>
          </form>
        )}

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : cronjobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No cron jobs found. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {cronjobs.map((cj) => (
              <Card
                key={cj.id}
                className="cursor-pointer hover:border-gray-400 transition-colors"
                onClick={() => openCron(cj.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {cj.name}
                    </span>
                    <Switch
                      checked={cj.enabled}
                      onClick={(e) => handleToggle(cj.id, e)}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-xs text-gray-500 font-mono">
                    {cj.schedule_type === "cron"
                      ? cj.cron_expression
                      : `Every ${cj.interval_seconds}s`}
                  </p>
                  {cj.last_run_status && (
                    <div className="flex items-center gap-2">
                      <StatusBadge status={cj.last_run_status} />
                      {cj.last_run_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(cj.last_run_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                  {cj.description && (
                    <p className="text-xs text-gray-500 truncate">
                      {cj.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Crons;
