import FindInPageBar from "@/components/FindInPageBar";
import HealthWarningsBanner from "@/components/HealthWarningsBanner";
import { RuntimeFreshnessWarning } from "@/components/RuntimeFreshnessWarning";
import { useHealthWarnings } from "@/hooks/useHealthWarnings";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import UserProfile from "@/components/UserProfile";
import { WorkspaceToolbar } from "@/components/workspace/WorkspaceToolbar";
import { useWorkspacePanel } from "@/contexts/workspace-tabs";
import dashboardWordmarkUrl from "@/assets/openbase-dashboard-wordmark.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useCliVersions } from "@/hooks/useCliVersions";
import { useProjectsAndThreads } from "@/hooks/useProjectsAndThreads";
import { useThreadsSidebarOpen } from "@/hooks/useSidebarThreads";
import { hasInsetWindowControls } from "@/lib/runtime-config";
import { cn } from "@/lib/utils";
import React from "react";
import { useNavigate } from "react-router-dom";
import { NavRail } from "./NavRail";
import { ThreadsSidebar } from "./ThreadsSidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

// The icon rail is 48px wide and the macOS traffic lights span about 78px,
// so the sidebar wordmark pads 30px past the rail, and a top bar with no
// sidebar beside the rail pads 36px (84px when the rail is folded away).

function CliVersionLine() {
  const cliVersions = useCliVersions();
  if (!cliVersions?.cli) return null;
  return (
    <div
      className="flex items-center gap-1.5 px-2 pt-1 text-[10px] text-sidebar-foreground/55"
      title={
        cliVersions.update_required
          ? "CLI update required"
          : cliVersions.update_available
            ? "CLI update available"
            : undefined
      }
    >
      <span className="truncate font-mono">
        CLI v{cliVersions.cli}
        {cliVersions.standalone && cliVersions.channel
          ? ` · ${cliVersions.channel}`
          : ""}
      </span>
      {cliVersions.update_required ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
      ) : cliVersions.update_available ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sidebar-foreground/40" />
      ) : null}
    </div>
  );
}

/**
 * Rail + threads sidebar. Wide windows show the icon rail beside a
 * collapsible threads column; narrow windows fold both into one sheet.
 */
function ShellSidebar({ insetWindowControls }: { insetWindowControls: boolean }) {
  const navigate = useNavigate();
  const { isMobile, open, setOpenMobile } = useSidebar();
  const lists = useProjectsAndThreads();
  const body = (
    <>
      <SidebarHeader
        className={cn(
          "ob-titlebar flex h-11 shrink-0 justify-center border-b border-sidebar-border py-0",
          insetWindowControls && !isMobile
            ? "pl-[30px] pr-3"
            : insetWindowControls
              ? "pl-[78px] pr-3"
              : "px-3",
        )}
      >
        <button
          type="button"
          onClick={() => {
            navigate("/dashboard/dispatch");
            if (isMobile) setOpenMobile(false);
          }}
          aria-label="Openbase Coder home"
          className="flex h-6 items-center self-start rounded px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <img
            src={dashboardWordmarkUrl}
            alt="Openbase"
            draggable={false}
            className="h-[23px] w-auto select-none mix-blend-multiply dark:mix-blend-screen dark:invert"
          />
        </button>
      </SidebarHeader>
      <SidebarContent className="gap-0 p-0">
        <ThreadsSidebar
          projects={lists.projects}
          threads={lists.threads}
          projectsLoading={lists.projectsLoading}
          nextProjectsUrl={lists.nextProjectsUrl}
          loadingMoreProjects={lists.loadingMoreProjects}
          loadMoreProjects={() => void lists.loadMoreProjects()}
          refresh={() => void lists.fetchData()}
        />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-2 py-1.5">
        <CliVersionLine />
      </SidebarFooter>
    </>
  );

  if (isMobile) {
    return (
      <Sidebar className="border-r-0">
        {body}
        <NavRail
          orientation="horizontal"
          onNavigate={() => setOpenMobile(false)}
          className="border-t border-sidebar-border bg-sidebar"
        />
      </Sidebar>
    );
  }

  return (
    <>
      <div
        data-testid="nav-rail-column"
        className="hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex"
      >
        {insetWindowControls ? (
          <div className="ob-titlebar h-11 shrink-0" />
        ) : null}
        <NavRail className="min-h-0 flex-1" />
      </div>
      {open ? (
        <aside
          aria-label="Threads"
          className="hidden h-full w-[--sidebar-width] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex"
        >
          {body}
        </aside>
      ) : null}
    </>
  );
}

function ShellHeader({ insetWindowControls }: { insetWindowControls: boolean }) {
  const { isMobile, open } = useSidebar();
  const health = useHealthWarnings();
  // When no sidebar sits beside the rail, the top bar starts under the
  // traffic lights and pads past them.
  const padLeft = !insetWindowControls
    ? "px-3 md:px-4"
    : isMobile
      ? "pl-[84px] pr-3"
      : open
        ? "px-3 md:px-4"
        : "pl-[36px] pr-3";
  return (
    <>
      <header
        className={cn(
          "ob-titlebar sticky top-0 z-10 flex h-11 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border bg-background/85 backdrop-blur",
          padLeft,
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SidebarTrigger
            aria-label={open ? "Hide threads sidebar" : "Show threads sidebar"}
            title={`${open ? "Hide" : "Show"} sidebar (⌘B)`}
          />
        </div>
        <div className="flex min-w-0 shrink items-center gap-1">
          <RuntimeFreshnessWarning freshness={health.freshness} />
          <WorkspaceToolbar />
          <NotificationsDropdown />
          <UserProfile />
        </div>
      </header>
      <HealthWarningsBanner warnings={health.warnings} onRefresh={health.refresh} />
    </>
  );
}

const DashboardChrome: React.FC<DashboardLayoutProps> = ({
  children,
  noPadding,
}) => {
  const [sidebarOpen, setSidebarOpen] = useThreadsSidebarOpen();
  // Electron on macOS hides the native title bar, so the top bar doubles as
  // the window's drag handle and must clear the inset traffic lights.
  const insetWindowControls = hasInsetWindowControls();

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      style={{ "--sidebar-width": "15rem" } as React.CSSProperties}
    >
      <div
        className={`ob-app-shell flex w-full ${noPadding ? "h-screen min-h-0 overflow-hidden" : "min-h-screen"}`}
      >
        <a className="ob-skip-link" href="#openbase-main">
          Skip to content
        </a>
        <ShellSidebar insetWindowControls={insetWindowControls} />
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col ${noPadding ? "overflow-hidden" : "overflow-auto"}`}
        >
          <ShellHeader insetWindowControls={insetWindowControls} />
          <FindInPageBar />
          <main
            id="openbase-main"
            className={
              noPadding
                ? "min-h-0 w-full flex-1"
                : "mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6"
            }
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default function DashboardLayout(props: DashboardLayoutProps) {
  const panel = useWorkspacePanel();
  if (panel)
    return (
      <div
        className={`workspace-page ${props.noPadding ? "" : "workspace-page-padded"}`}
      >
        {props.children}
      </div>
    );
  return <DashboardChrome {...props} />;
}
