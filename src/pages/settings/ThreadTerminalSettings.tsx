import { Panel } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import { useThreadTerminalTab } from "@/hooks/useThreadTerminalTab";

/** Opt-in toggle for the thread view's native Codex / Claude Code TUI tab. */
export function ThreadTerminalSettings() {
  const [enabled, setEnabled] = useThreadTerminalTab();
  return (
    <Panel>
      <div className="border-b border-border px-3 py-2.5">
        <p className="text-[12.5px] font-medium text-foreground">
          Thread terminal
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Adds a Terminal tab to threads that runs the full Codex or Claude
          Code TUI with the conversation already loaded.
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <p className="text-[12px] text-muted-foreground">
          Show a Terminal tab next to Chat in thread views.
        </p>
        <Switch
          aria-label="Show a Terminal tab in thread views"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>
    </Panel>
  );
}
