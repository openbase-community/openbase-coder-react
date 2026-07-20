import HealthWarningsBanner from "@/components/HealthWarningsBanner";
import { OpenbaseWordmark } from "@/components/OpenbaseWordmark";
import UserProfile from "@/components/UserProfile";
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
import {
  CREATE_ORDER,
  SYSTEM_ORDER,
  WORKSPACE_ORDER,
  navigationTitle,
  orderNavigationItems,
} from "@/lib/app-navigation";
import { openExternalUrl } from "@/lib/external-links";
import { getRuntimeShell } from "@/lib/runtime-config";
import {
  BUILT_IN_SIDEBAR_ITEMS,
  readHiddenSidebarItems,
  sidebarItemVisible,
  SIDEBAR_PREFERENCES_EVENT,
  type SidebarItem,
} from "@/lib/sidebar-preferences";
import { useCliVersions } from "@/lib/useCliVersions";
import { usePluginRegistry } from "@/plugin-registry";
import { ArrowUpRight, ChevronDown, Zap } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface DashboardLayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

const CREATE_KEYS = new Set<string>(CREATE_ORDER);

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  noPadding,
}) => {
  const isNativeShell = getRuntimeShell() === "electron";
  const { pluginConsolePages } = usePluginRegistry();
  const navigate = useNavigate();
  const location = useLocation();
  const [hiddenSidebarItems, setHiddenSidebarItems] = useState<string[]>(() =>
    readHiddenSidebarItems(),
  );
  const [systemOpen, setSystemOpen] = useState(() =>
    BUILT_IN_SIDEBAR_ITEMS.some(
      (item) => item.section === "system" && location.pathname.startsWith(item.path),
    ),
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

  const allWorkspaceNav = BUILT_IN_SIDEBAR_ITEMS.filter(
    (item) =>
      item.section === "workspace" &&
      sidebarItemVisible(item, hiddenSidebarItems),
  );
  const primaryNav = orderNavigationItems(
    allWorkspaceNav.filter((item) => !CREATE_KEYS.has(item.key)),
    WORKSPACE_ORDER,
  );
  const createNav = orderNavigationItems(
    allWorkspaceNav.filter((item) => CREATE_KEYS.has(item.key)),
    CREATE_ORDER,
  );
  const systemNav = orderNavigationItems(
    BUILT_IN_SIDEBAR_ITEMS.filter(
      (item) =>
        item.section === "system" &&
        item.key !== "settings" &&
        sidebarItemVisible(item, hiddenSidebarItems),
    ),
    SYSTEM_ORDER,
  );
  const settingsNav = BUILT_IN_SIDEBAR_ITEMS.filter(
    (item) => item.key === "settings" && sidebarItemVisible(item, hiddenSidebarItems),
  );
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

  const navigateToItem = (item: SidebarItem) => {
    if (item.externalUrl) {
      void openExternalUrl(item.externalUrl);
      return;
    }
    navigate(item.path);
  };

  const renderNavItems = (items: SidebarItem[]) =>
    items.map((item) => {
      const displayTitle = navigationTitle(item);
      return (
        <SidebarMenuItem key={item.path}>
          <SidebarMenuButton
            className="ob-nav-item h-10 gap-3 rounded-xl px-3 text-[13.5px] font-medium text-sidebar-foreground transition-all duration-200 hover:bg-white/60 hover:text-foreground data-[active=true]:bg-white/85 data-[active=true]:text-primary data-[active=true]:shadow-[0_1px_2px_rgba(24,73,139,.08),inset_0_0_0_1px_rgba(255,255,255,.78)]"
            isActive={item.externalUrl ? false : isActive(item.path, item.exact ?? false)}
            onClick={() => navigateToItem(item)}
            tooltip={displayTitle}
          >
            <item.icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
            <span>{displayTitle}</span>
            {item.externalUrl ? (
              <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-45" />
            ) : null}
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  const pageTitle = (() => {
    const item = [...allWorkspaceNav, ...systemNav, ...settingsNav, ...pluginNav].find(
      (candidate) =>
        !candidate.externalUrl && isActive(candidate.path, candidate.exact ?? false),
    );
    return item ? navigationTitle(item) : "Openbase";
  })();

  const groupLabelClass =
    "h-8 px-3 text-[11px] font-semibold tracking-[0.04em] text-sidebar-foreground/55";

  return (
    <SidebarProvider style={{ "--sidebar-width": "15.5rem" } as React.CSSProperties}>
      <div
        className={`ob-app-shell flex min-h-dvh w-full overflow-hidden ${
          noPadding ? "h-dvh min-h-0" : ""
        }`}
        data-native-shell={isNativeShell ? "true" : "false"}
      >
        <a className="ob-skip-link" href="#openbase-main">Skip to content</a>
        <Sidebar
          className="ob-app-sidebar border-0 bg-transparent text-sidebar-foreground"
          collapsible={isNativeShell ? "icon" : "offcanvas"}
          variant={isNativeShell ? "inset" : "sidebar"}
        >
          <SidebarHeader className="ob-sidebar-header px-4 pb-4 pt-5">
            <div className="flex h-8 items-center px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <OpenbaseWordmark className="group-data-[collapsible=icon]:hidden" />
              <span className="hidden h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-white/75 shadow-[0_1px_2px_rgba(24,73,139,.08),inset_0_0_0_1px_rgba(255,255,255,.84)] group-data-[collapsible=icon]:flex">
                <span className="block h-[18px] w-[18px] overflow-hidden">
                  <OpenbaseWordmark className="h-[18px] max-w-none" />
                </span>
              </span>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-3 pb-3">
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className={groupLabelClass}>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">{renderNavItems(primaryNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {createNav.length > 0 ? (
              <SidebarGroup className="mt-4 p-0">
                <SidebarGroupLabel className={groupLabelClass}>Create &amp; automate</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">{renderNavItems(createNav)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}

            {pluginNav.length > 0 ? (
              <SidebarGroup className="mt-4 p-0">
                <SidebarGroupLabel className={groupLabelClass}>Plugins</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">{renderNavItems(pluginNav)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}

            <Collapsible
              className="mt-4 group-data-[collapsible=icon]:hidden"
              onOpenChange={setSystemOpen}
              open={systemOpen}
            >
              <SidebarGroup className="p-0">
                <CollapsibleTrigger asChild>
                  <button
                    className="flex h-8 w-full items-center rounded-lg px-3 text-[11px] font-semibold tracking-[0.04em] text-sidebar-foreground/55 hover:bg-white/40 hover:text-foreground"
                    type="button"
                  >
                    System
                    <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${systemOpen ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent className="pt-1">
                    <SidebarMenu className="gap-1">{renderNavItems(systemNav)}</SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          </SidebarContent>

          <SidebarFooter className="gap-2 px-3 pb-3 pt-2">
            <SidebarMenu className="gap-1">{renderNavItems(settingsNav)}</SidebarMenu>
            {cliVersions?.cli ? (
              <div
                className="flex items-center gap-2 px-3 pt-1 text-[11px] text-sidebar-foreground/55 group-data-[collapsible=icon]:hidden"
                title={cliVersions.update_required ? "CLI update required" : cliVersions.update_available ? "CLI update available" : undefined}
              >
                <span className="truncate font-mono">
                  CLI {cliVersions.cli}
                  {cliVersions.standalone && cliVersions.channel ? ` · ${cliVersions.channel}` : ""}
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

        <div className={`ob-app-window flex min-h-0 min-w-0 flex-1 flex-col ${noPadding ? "overflow-hidden" : "overflow-auto"}`}>
          <header className="ob-app-titlebar sticky top-0 z-10 flex h-[58px] shrink-0 items-center justify-between border-b border-border/60 px-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className={`ob-no-drag h-8 w-8 text-muted-foreground hover:bg-accent ${isNativeShell ? "" : "md:hidden"}`} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-[-0.01em] text-foreground">{pageTitle}</p>
                <p className="hidden text-[11px] text-muted-foreground sm:block">Openbase on this Mac</p>
              </div>
            </div>
            <div className="ob-no-drag flex items-center gap-2">
              <UserProfile />
            </div>
          </header>
          <HealthWarningsBanner />
          <main
            className={noPadding ? "min-h-0 flex-1 overflow-hidden" : "ob-app-main min-h-0 flex-1 overflow-auto px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:px-8"}
            id="openbase-main"
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
