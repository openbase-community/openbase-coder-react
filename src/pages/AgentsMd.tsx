import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { ChevronDown, RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type AgentsMdTarget = string;

type AgentsMdDocumentResponse = {
  id: AgentsMdTarget;
  label: string;
  description: string;
  content: string;
  path: string;
  codex_home: string;
  exists: boolean;
};

type AgentsMdDocument = AgentsMdDocumentResponse & {
  savedContent: string;
  existenceKnown: boolean;
};

type AgentsMdResponse = {
  content?: string;
  path?: string;
  codex_home?: string;
  documents?: AgentsMdDocumentResponse[];
  error?: string;
};

const EXPECTED_TARGETS: Array<
  Pick<AgentsMdDocumentResponse, "id" | "label" | "description">
> = [
  {
    id: "voice",
    label: "Voice Codex home instructions",
    description:
      "Affects the Openbase Coder voice Codex home environment and its general voice-coding behavior.",
  },
  {
    id: "normal",
    label: "Normal Codex home instructions",
    description:
      "Affects regular non-voice Codex sessions that use the standard Codex home directory.",
  },
  {
    id: "claude",
    label: "Openbase Claude config instructions",
    description:
      "Affects Claude Code sessions that use Openbase's managed CLAUDE_CONFIG_DIR.",
  },
  {
    id: "direct_livekit",
    label: "Direct voice session instructions",
    description:
      "Affects agent threads that are directly connected to a LiveKit voice session after a voice transfer.",
  },
  {
    id: "super_agent",
    label: "Super Agent instructions",
    description:
      "Affects normal non-dispatch Super Agent threads started or resumed by Openbase Coder.",
  },
  {
    id: "dispatcher",
    label: "Dispatcher-only instructions",
    description:
      "Affects only the LiveKit dispatcher that routes voice sessions and coordinates transfers.",
  },
];

const fallbackPathForTarget = (
  target: AgentsMdTarget,
  codexHome: string,
): string => {
  if (target === "normal") {
    return "~/.codex/AGENTS.md";
  }
  if (target === "claude") {
    return "~/.openbase/claude_config/CLAUDE.md";
  }
  if (target === "direct_livekit") {
    return `${codexHome}/direct-livekit-target-instructions.md`;
  }
  if (target === "super_agent") {
    return `${codexHome}/super-agent-instructions.md`;
  }
  if (target === "dispatcher") {
    return `${codexHome}/DISPATCHER_INSTRUCTIONS.md`;
  }
  return `${codexHome}/AGENTS.md`;
};

const mergeExpectedDocuments = (
  data: AgentsMdResponse,
): Array<AgentsMdDocumentResponse & { existenceKnown: boolean }> => {
  const apiDocuments = data.documents ?? [];
  const apiByTarget = new Map(
    apiDocuments.map((document) => [document.id, document]),
  );
  const codexHome =
    data.codex_home ??
    apiByTarget.get("voice")?.codex_home ??
    "~/.openbase/codex_home";
  const expectedDocuments = EXPECTED_TARGETS.map((target) => ({
    ...target,
    content: "",
    path: fallbackPathForTarget(target.id, codexHome),
    codex_home:
      target.id === "normal"
        ? "~/.codex"
        : target.id === "claude"
          ? "~/.openbase/claude_config"
          : codexHome,
    exists: false,
    ...apiByTarget.get(target.id),
    existenceKnown: apiByTarget.has(target.id),
  }));
  const expectedIds = new Set(EXPECTED_TARGETS.map((target) => target.id));
  const extraDocuments = apiDocuments
    .filter((document) => !expectedIds.has(document.id))
    .map((document) => ({ ...document, existenceKnown: true }));
  return [...expectedDocuments, ...extraDocuments];
};

const toDocumentState = (
  document: AgentsMdDocumentResponse & { existenceKnown?: boolean },
): AgentsMdDocument => ({
  ...document,
  existenceKnown: document.existenceKnown ?? true,
  savedContent: document.content,
});

const AgentsMd = () => {
  const [documents, setDocuments] = useState<AgentsMdDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTarget, setSavingTarget] = useState<AgentsMdTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedTarget, setSavedTarget] = useState<AgentsMdTarget | null>(null);
  const [openTargets, setOpenTargets] = useState<Record<string, boolean>>({});

  const loadAgentsMd = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSavedTarget(null);
    try {
      const res = await apiFetch("/api/agents-md/");
      const data = (await res.json()) as AgentsMdResponse;
      if (!res.ok) {
        throw new Error(data.error || "Unable to load instructions.");
      }
      const nextDocuments = mergeExpectedDocuments(data).map(toDocumentState);
      setDocuments(nextDocuments);
      setOpenTargets((current) => {
        const next = { ...current };
        for (const document of nextDocuments) {
          next[document.id] = current[document.id] ?? false;
        }
        return next;
      });
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

  const updateContent = (target: AgentsMdTarget, content: string) => {
    setDocuments((current) =>
      current.map((document) =>
        document.id === target ? { ...document, content } : document,
      ),
    );
    setSavedTarget(null);
  };

  const saveAgentsMd = async (document: AgentsMdDocument) => {
    setSavingTarget(document.id);
    setError(null);
    setSavedTarget(null);
    try {
      const res = await apiFetch("/api/agents-md/", {
        method: "PUT",
        body: JSON.stringify({
          target: document.id,
          content: document.content,
        }),
      });
      const data = (await res.json()) as AgentsMdDocumentResponse & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Unable to save instructions.");
      }
      setDocuments((current) =>
        current.map((currentDocument) =>
          currentDocument.id === document.id
            ? toDocumentState({
                ...currentDocument,
                ...data,
                description: currentDocument.description,
              })
            : currentDocument,
        ),
      );
      setSavedTarget(document.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reach the local API.",
      );
    } finally {
      setSavingTarget(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex min-h-[calc(100vh-6.5rem)] flex-col space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Instructions
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Edit Codex instruction files for each home environment.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-fit px-2.5 text-[12px]"
            onClick={loadAgentsMd}
            disabled={loading || savingTarget !== null}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Reload
          </Button>
        </div>

        {error ? (
          <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {error}
          </div>
        ) : null}

        {loading && documents.length === 0 ? (
          <div className="rounded border border-border bg-surface p-3 text-[12px] text-muted-foreground">
            Loading instructions...
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {documents.map((document) => {
              const dirty = document.content !== document.savedContent;
              const saving = savingTarget === document.id;
              const open = openTargets[document.id] ?? false;
              return (
                <Collapsible
                  key={document.id}
                  open={open}
                  onOpenChange={(nextOpen) => {
                    setOpenTargets((current) => ({
                      ...current,
                      [document.id]: nextOpen,
                    }));
                  }}
                  asChild
                >
                  <section className="flex min-w-0 flex-col overflow-hidden rounded border border-border bg-surface">
                    <div className="flex flex-col gap-2 border-b border-border px-3 py-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mt-0.5 h-6 w-6 shrink-0"
                          onClick={() => {
                            setOpenTargets((current) => ({
                              ...current,
                              [document.id]: !open,
                            }));
                          }}
                          aria-label={
                            open
                              ? `Collapse ${document.label}`
                              : `Expand ${document.label}`
                          }
                        >
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${
                              open ? "" : "-rotate-90"
                            }`}
                          />
                        </Button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-[13px] font-medium text-foreground">
                              {document.label}
                            </h2>
                            {document.existenceKnown && !document.exists ? (
                              <span className="text-[11px] text-muted-foreground">
                                Not created yet
                              </span>
                            ) : !document.existenceKnown ? (
                              <span className="text-[11px] text-muted-foreground">
                                Existence unchecked
                              </span>
                            ) : null}
                            {savedTarget === document.id ? (
                              <span className="text-[12px] text-success">
                                Saved.
                              </span>
                            ) : dirty ? (
                              <span className="text-[12px] text-muted-foreground">
                                Unsaved
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[12px] text-muted-foreground">
                            {document.description}
                          </p>
                          <p
                            className="mt-1 truncate font-mono text-[10.5px] text-muted-foreground/75"
                            title={document.path}
                          >
                            {document.path}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 sm:pl-3">
                        {!open && document.content ? (
                          <span className="text-[11px] text-muted-foreground">
                            {document.content.split(/\r\n|\r|\n/).length} lines
                          </span>
                        ) : null}
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-[12px]"
                          onClick={() => {
                            void saveAgentsMd(document);
                          }}
                          disabled={loading || savingTarget !== null || !dirty}
                        >
                          <Save className="h-3 w-3" />
                          {saving
                            ? "Saving..."
                            : document.exists || !document.existenceKnown
                              ? "Save"
                              : "Create"}
                        </Button>
                      </div>
                    </div>
                    <CollapsibleContent asChild>
                      <Textarea
                        value={document.content}
                        onChange={(event) => {
                          updateContent(document.id, event.target.value);
                        }}
                        spellCheck={false}
                        className="min-h-[24rem] flex-1 resize-none rounded-none border-0 bg-background p-3 font-mono text-[12px] leading-5 shadow-none focus-visible:ring-0"
                      />
                    </CollapsibleContent>
                  </section>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AgentsMd;
