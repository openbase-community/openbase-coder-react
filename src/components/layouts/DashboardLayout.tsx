import FindInPageBar from "@/components/FindInPageBar";
import HealthWarningsBanner from "@/components/HealthWarningsBanner";
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
import {
  BUILT_IN_SIDEBAR_ITEMS,
  readHiddenSidebarItems,
  sidebarItemVisible,
  SIDEBAR_PREFERENCES_EVENT,
  type SidebarItem,
} from "@/lib/sidebar-preferences";
import { usePluginRegistry } from "@/plugin-registry";
import { ArrowUpRight, ChevronDown, Zap } from "lucide-react";
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

  const [systemOpen, setSystemOpen] = useState(() =>
    systemNav.some((item) => isActive(item.path, item.exact ?? false)),
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
            isActive={
              item.externalUrl
                ? false
                : isActive(item.path, item.exact ?? false)
            }
            onClick={() => navigateToItem(item)}
            tooltip={title}
            className="h-8 gap-2.5 rounded-md px-2 text-[12.5px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary data-[active=true]:shadow-[0_1px_2px_hsl(var(--sidebar-primary)/0.12),inset_0_0_0_1px_hsl(0_0%_100%/0.9)]"
          >
            <item.icon className="h-4 w-4" strokeWidth={1.9} />
            <span>{title}</span>
            {item.externalUrl ? (
              <ArrowUpRight className="ml-auto h-3 w-3 opacity-45" />
            ) : null}
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

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
        <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="flex h-11 justify-center border-b border-sidebar-border px-3 py-0">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
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

          <SidebarContent className="px-2 py-2">
            <SidebarGroup className="px-0">
              <SidebarGroupLabel className={groupLabelClass}>
                Workspace
              </SidebarGroupLabel>
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

          <SidebarFooter className="border-t border-sidebar-border px-2 py-2">
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
          <header className="sticky top-0 z-10 flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/85 px-3 backdrop-blur md:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <SidebarTrigger className="md:hidden" />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <WorkspaceToolbar />
              <NotificationsDropdown />
              <UserProfile />
            </div>
          </header>
          <HealthWarningsBanner />
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
