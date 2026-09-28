import { CONFIGURE_TABS, configureTabForPath } from "@/lib/configure-tabs";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Horizontal tab strip shown at the top of the Loops, Skills, Memories and
 * Templates pages. Selecting a tab navigates to that page's route, so the
 * browser URL, workspace tabs and sidebar state all stay in sync.
 */
export function ConfigureTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const current = configureTabForPath(location.pathname)?.key;

  return (
    <div
      role="tablist"
      aria-label="Configure"
      className="flex flex-wrap items-center gap-1"
    >
      {CONFIGURE_TABS.map((tab) => {
        const selected = tab.key === current;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => {
              if (!selected) navigate(tab.path);
            }}
            className={cn(
              "flex h-8 items-center gap-2 rounded-md px-2.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            <tab.icon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
            {tab.title}
          </button>
        );
      })}
    </div>
  );
}
