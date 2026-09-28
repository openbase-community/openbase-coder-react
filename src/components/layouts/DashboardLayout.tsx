import FindInPageBar from "@/components/FindInPageBar";
import HealthWarningsBanner from "@/components/HealthWarningsBanner";
import { RuntimeFreshnessWarning } from "@/components/RuntimeFreshnessWarning";
import { useHealthWarnings } from "@/hooks/useHealthWarnings";
import { useServiceHealth } from "@/hooks/useServiceHealth";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import UserProfile from "@/components/UserProfile";
import { WorkspaceToolbar } from "@/components/workspace/WorkspaceToolbar";
import { useWorkspacePanel } from "@/contexts/workspace-tabs";
import dashboardWordmarkUrl from "@/assets/openbase-dashboard-wordmark.png";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useCliVersions } from "@/hooks/useCliVersions";
import {
  SYSTEM_ORDER,
  WORKSPACE_ORDER,
  navigationTitle,
  orderNavigationItems,
} from "@/lib/app-navigation";
import { openExternalUrl } from "@/lib/external-links";
import { hasInsetWindowControls } from "@/lib/runtime-config";
import {
  BUILT_IN_SIDEBAR_ITEMS,
  readHiddenSidebarItems,
  sidebarItemVisible,
  SIDEBAR_PREFERENCES_EVENT,
  type SidebarItem,
} from "@/lib/sidebar-preferences";
import { usePluginRegistry } from "@/plugin-registry";
import { AlertTriangle, ArrowUpRight, ChevronDown, Zap } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface DashboardLayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

const groupLabelClass =
  "px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/55";

const DashboardChrome: React.FC<DashboardLayoutProps> = ({
  children,
  noPadding,
}) => {
  const { pluginConsolePages } = usePluginRegistry();
  const navigate = useNavigate();
  const location = useLocation();
  const [hiddenSidebarItems, setHiddenSidebarItems] = useState<string[]>(() =>
    readHiddenSidebarItems(),
  );
  const cliVersions = useCliVersions();
  const health = useHealthWarnings();
  const serviceHealth = useServiceHealth();
  const servicesDegraded =
    serviceHealth.required !== null &&
    serviceHealth.healthy < serviceHealth.required;
  const serviceSummary =
    serviceHealth.required === null
      ? null
      : servicesDegraded
        ? `${serviceHealth.healthy} of ${serviceHealth.required} required checks healthy`
        : "All required checks healthy";

  useEffect(() => {
    const refresh = () => setHiddenSidebarItems(readHiddenSidebarItems());
    window.addEventListener(SIDEBAR_PREFERENCES_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SIDEBAR_PREFERENCES_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const primaryNav = orderNavigationItems(
    BUILT_IN_SIDEBAR_ITEMS.filter(
      (item) =>
        item.section === "workspace" &&
        sidebarItemVisible(item, hiddenSidebarItems),
    ),
    WORKSPACE_ORDER,
  );
  // "cloud" and "settings" live in the footer, not the collapsible System group.
  const systemNav = orderNavigationItems(
    BUILT_IN_SIDEBAR_ITEMS.filter(
      (item) =>
        item.section === "system" &&
        item.key !== "settings" &&
        item.key !== "cloud" &&
        sidebarItemVisible(item, hiddenSidebarItems),
    ),
    SYSTEM_ORDER,
  );
  const footerNav = BUILT_IN_SIDEBAR_ITEMS.filter(
    (item) =>
      (item.key === "cloud" || item.key === "settings") &&
      sidebarItemVisible(item, hiddenSidebarItems),
  ).sort((a, b) => (a.key === "cloud" ? -1 : b.key === "cloud" ? 1 : 0));
  const pluginNav: SidebarItem[] = pluginConsolePages
    .filter((page) => page.sidebar)
    .map((page) => ({
      key: `plugin:${page.pluginId}:${page.key}`,
      path: page.route,
      icon: Zap,
      title: page.title,
      section: "plugins" as const,
    }))
    .filter((item) => sidebarItemVisible(item, hiddenSidebarItems));

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);
  const isItemActive = (item: SidebarItem) =>
    isActive(item.path, item.exact ?? false) ||
    (item.activePaths ?? []).some((path) => isActive(path));

  const [systemOpen, setSystemOpen] = useState(() =>
    systemNav.some((item) => isItemActive(item)),
  );

  const navigateToItem = (item: SidebarItem) => {
    if (item.externalUrl) {
      void openExternalUrl(item.externalUrl);
      return;
    }
    navigate(item.path);
  };

  const renderNavItems = (items: SidebarItem[]) =>
    items.map((item) => {
      const title = navigationTitle(item);
      return (
        <SidebarMenuItem key={item.path}>
          <SidebarMenuButton
            isActive={item.externalUrl ? false : isItemActive(item)}
            onClick={() => navigateToItem(item)}
            tooltip={title}
            className="h-8 gap-2.5 rounded-md px-2 text-[12.5px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-primary"
          >
            <item.icon className="h-4 w-4" strokeWidth={1.9} />
            <span>{title}</span>
            {item.externalUrl ? (
              <ArrowUpRight className="ml-auto h-3 w-3 opacity-45" />
            ) : item.key === "status" && servicesDegraded ? (
              <AlertTriangle
                aria-label="Some required services are not running"
                className="ml-auto h-3.5 w-3.5 text-warning"
              />
            ) : null}
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  // Electron on macOS hides the native title bar, so the top bar doubles as
  // the window's drag handle and must clear the inset traffic lights.
  const insetWindowControls = hasInsetWindowControls();

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "14rem" } as React.CSSProperties}
    >
      <div
        className={`ob-app-shell flex w-full ${noPadding ? "h-screen min-h-0 overflow-hidden" : "min-h-screen"}`}
      >
        <a className="ob-skip-link" href="#openbase-main">
          Skip to content
        </a>
        <Sidebar className="border-r-0 bg-sidebar text-sidebar-foreground group-data-[side=left]:border-r-0">
          <SidebarHeader
            className={`ob-titlebar flex h-11 justify-center border-b border-sidebar-border py-0 ${insetWindowControls ? "pl-[78px] pr-3" : "px-3"}`}
          >
            <button
              type="button"
              onClick={() => navigate("/dashboard/dispatch")}
              aria-label="Openbase Coder home"
              className="flex h-6 items-center rounded px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <img
                src={dashboardWordmarkUrl}
                alt="Openbase"
                draggable={false}
                className="h-[23px] w-auto select-none mix-blend-multiply dark:mix-blend-screen dark:invert"
              />
            </button>
          </SidebarHeader>

          <SidebarContent className="border-r border-sidebar-border px-2 py-2">
            <SidebarGroup className="px-0">
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {renderNavItems(primaryNav)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {pluginNav.length > 0 ? (
              <SidebarGroup className="mt-2 px-0">
                <SidebarGroupLabel className={groupLabelClass}>
                  Plugins
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {renderNavItems(pluginNav)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}

            {systemNav.length > 0 ? (
              <Collapsible
                className="mt-auto border-t border-sidebar-border pt-2"
                onOpenChange={setSystemOpen}
                open={systemOpen}
              >
                <SidebarGroup className="px-0">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      aria-label={
                        systemOpen
                          ? "Collapse system navigation"
                          : "Expand system navigation"
                      }
                      className="flex h-7 w-full items-center rounded px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      System
                      <ChevronDown
                        className={`ml-auto h-4 w-4 transition-transform ${systemOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  {serviceSummary ? (
                    <button
                      type="button"
                      onClick={() => navigate("/dashboard/status")}
                      title={
                        serviceHealth.unhealthy.length
                          ? `Not running: ${serviceHealth.unhealthy.join(", ")}`
                          : "Open Status"
                      }
                      className={`flex h-6 w-full items-center rounded px-2 text-left text-[11px] transition-colors hover:bg-sidebar-accent ${
                        servicesDegraded ? "text-destructive" : "text-success"
                      }`}
                    >
                      <span className="truncate">{serviceSummary}</span>
                    </button>
                  ) : null}
                  <CollapsibleContent>
                    <SidebarGroupContent className="pt-1">
                      <SidebarMenu className="gap-0.5">
                        {renderNavItems(systemNav)}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            ) : null}
          </SidebarContent>

          <SidebarFooter className="border-r border-t border-sidebar-border px-2 py-2">
            <SidebarMenu className="gap-0.5">
              {renderNavItems(footerNav)}
            </SidebarMenu>
            {cliVersions?.cli ? (
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
            ) : null}
          </SidebarFooter>
        </Sidebar>

        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col ${noPadding ? "overflow-hidden" : "overflow-auto"}`}
        >
          <header className="ob-titlebar sticky top-0 z-10 flex h-11 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border bg-background/85 px-3 backdrop-blur md:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <SidebarTrigger className="md:hidden" />
            </div>
            <div className="flex min-w-0 shrink items-center gap-1">
              <RuntimeFreshnessWarning freshness={health.freshness} />
              <WorkspaceToolbar />
              <NotificationsDropdown />
              <UserProfile />
            </div>
          </header>
          <HealthWarningsBanner warnings={health.warnings} onRefresh={health.refresh} />
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
