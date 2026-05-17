import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type AgentsMdResponse = {
  content: string;
  path: string;
  codex_home: string;
  error?: string;
};

const AgentsMd = () => {
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [path, setPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const loadAgentsMd = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSavedMessage(null);
    try {
      const res = await apiFetch("/api/agents-md/");
      const data = (await res.json()) as AgentsMdResponse;
      if (!res.ok) {
        throw new Error(data.error || "Unable to load AGENTS.md.");
      }
      setContent(data.content);
      setSavedContent(data.content);
      setPath(data.path);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reach the local API.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAgentsMd();
  }, [loadAgentsMd]);

  const saveAgentsMd = async () => {
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const res = await apiFetch("/api/agents-md/", {
        method: "PUT",
        body: JSON.stringify({ content }),
      });
      const data = (await res.json()) as AgentsMdResponse;
      if (!res.ok) {
        throw new Error(data.error || "Unable to save AGENTS.md.");
      }
      setContent(data.content);
      setSavedContent(data.content);
      setPath(data.path);
      setSavedMessage("Saved.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reach the local API.",
      );
    } finally {
      setSaving(false);
    }
  };

  const dirty = content !== savedContent;

  return (
    <DashboardLayout>
      <div className="flex min-h-[calc(100vh-6.5rem)] flex-col space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              AGENTS.md
            </h1>
            <p
              className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground"
              title={path}
            >
              {path || "Loading target path..."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {savedMessage ? (
              <span className="text-[12px] text-success">{savedMessage}</span>
            ) : dirty ? (
              <span className="text-[12px] text-muted-foreground">Unsaved</span>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              onClick={loadAgentsMd}
              disabled={loading || saving}
            >
              <RefreshCw
                className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
              />
              Reload
            </Button>
            <Button
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              onClick={saveAgentsMd}
              disabled={loading || saving || !dirty}
            >
              <Save className="h-3 w-3" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {error}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 overflow-hidden rounded border border-border bg-surface">
          {loading && !path ? (
            <div className="p-3 text-[12px] text-muted-foreground">
              Loading AGENTS.md...
            </div>
          ) : (
            <Textarea
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                setSavedMessage(null);
              }}
              spellCheck={false}
              className="min-h-[28rem] flex-1 resize-none rounded-none border-0 bg-background p-3 font-mono text-[12px] leading-5 shadow-none focus-visible:ring-0"
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgentsMd;
