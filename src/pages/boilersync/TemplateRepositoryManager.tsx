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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import type { BoilerSyncSource } from "@/lib/boilersync";
import { GitBranch, Plus, Trash2 } from "lucide-react";
import { type FormEvent } from "react";

type TemplateRepositoryManagerProps = {
  busy: boolean;
  repoUrl: string;
  removingSource: string | null;
  sources: BoilerSyncSource[];
  onAdd: (event: FormEvent<HTMLFormElement>) => void;
  onRepoUrlChange: (value: string) => void;
  onRemove: (source: BoilerSyncSource) => void;
};

export function TemplateRepositoryManager({
  busy,
  repoUrl,
  removingSource,
  sources,
  onAdd,
  onRepoUrlChange,
  onRemove,
}: TemplateRepositoryManagerProps) {
  return (
    <Panel>
      <div className="border-b border-border px-3 py-2.5">
        <h2 className="text-[12.5px] font-medium text-foreground">
          Template repositories
        </h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Import any public GitHub repository that contains BoilerSync templates.
        </p>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={onAdd}>
          <Input
            aria-label="Template repository URL"
            className="h-8 min-w-0 flex-1 font-mono text-[11px]"
            disabled={busy}
            onChange={(event) => onRepoUrlChange(event.target.value)}
            placeholder="https://github.com/org/templates.git"
            type="url"
            value={repoUrl}
          />
          <Button
            className="h-8 shrink-0 px-3 text-[12px]"
            disabled={busy || !repoUrl.trim()}
            size="sm"
            type="submit"
            variant="outline"
          >
            <Plus className="h-3.5 w-3.5" />
            {busy ? "Importing…" : "Add repository"}
          </Button>
        </form>
      </div>

      {sources.length === 0 ? (
        <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">
          No template repositories imported yet.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {sources.map((source) => {
            const sourceKey = `${source.org}/${source.repo}`;
            const removing = removingSource === sourceKey;
            return (
              <div
                className="flex min-w-0 items-center gap-3 px-3 py-2.5"
                key={sourceKey}
              >
                <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-foreground">
                    {sourceKey}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">
                    {source.remote_url ?? source.path}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
                  {source.template_count} templates
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      aria-label={`Remove ${sourceKey}`}
                      className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                      disabled={busy || removing}
                      size="sm"
                      title="Remove template repository"
                      variant="ghost"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove {sourceKey}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This deletes the local template repository checkout. It
                        does not change the GitHub repository or projects already
                        created from its templates.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onRemove(source)}>
                        Remove repository
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
