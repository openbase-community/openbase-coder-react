import { NewThreadDialog } from "@/components/NewThreadDialog";
import { OpenbaseWordmark } from "@/components/OpenbaseWordmark";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import HealthWarningsBanner from "@/components/HealthWarningsBanner";
import UserProfile from "@/components/UserProfile";
import {
  DESKTOP_CREATE_ORDER,
  DESKTOP_SYSTEM_ORDER,
  DESKTOP_WORKSPACE_ORDER,
  desktopSidebarTitle,
  orderDesktopItems,
} from "@/lib/desktop-navigation";
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
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Plus,
  Search,
  Terminal,
  Zap,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface DashboardLayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

const CREATE_KEYS = new Set<string>(DESKTOP_CREATE_ORDER);

function DesktopCommandSwitcher({
  items,
  open,
  onOpenChange,
  onNavigate,
  onNewThread,
}: {
  items: SidebarItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (item: SidebarItem) => void;
  onNewThread: () => void;
}) {
  const [query, setQuery] = useState("");
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      `${item.title} ${item.key}`.toLowerCase().includes(normalized),
    );
  }, [items, query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ob-command-dialog gap-0 overflow-hidden p-0 sm:max-w-[600px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Openbase quick switcher</DialogTitle>
          <DialogDescription>Jump to a page or start a thread.</DialogDescription>
        </DialogHeader>
        <div className="relative border-b border-border/70 px-4 py-3">
          <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            className="h-11 border-0 bg-transparent pl-9 pr-14 text-[15px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages and actions"
            value={query}
          />
          <kbd className="absolute right-5 top-1/2 -translate-y-1/2 rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            esc
          </kbd>
        </div>
        <div className="max-h-[430px] overflow-y-auto p-2.5">
          {(!query || "new thread".includes(query.toLowerCase())) && (
            <button
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                onOpenChange(false);
                onNewThread();
              }}
              type="button"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-sm">
                <Plus className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">New thread</span>
                <span className="block text-xs text-muted-foreground">
                  Start work in a project
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}

          <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/75">
            Go to
          </p>
          {filteredItems.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No matching pages
            </p>
          ) : (
            filteredItems.map((item) => (
              <button
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                key={item.key}
                onClick={() => {
                  onOpenChange(false);
                  onNavigate(item);
                }}
                type="button"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/[0.08] text-primary">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">
                  {item.key === "launchctl" ? "Services" : item.title}
                </span>
                {item.externalUrl ? (
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/50" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
            ))
          )}
        </div>
        <div className="flex items-center border-t border-border/70 bg-background/55 px-5 py-3 text-xs text-muted-foreground">
          <span>Use Tab to move, Enter to open</span>
          <span className="ml-auto">Openbase</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  noPadding,
}) => {
  const isDesktop = getRuntimeShell() === "electron";
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
  const [commandOpen, setCommandOpen] = useState(false);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
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

  useEffect(() => {
    if (!isDesktop) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDesktop]);

  const allWorkspaceNav = BUILT_IN_SIDEBAR_ITEMS.filter(
    (item) =>
      item.section === "workspace" &&
      sidebarItemVisible(item, hiddenSidebarItems),
  );
  const primaryNav = isDesktop
    ? orderDesktopItems(
        allWorkspaceNav.filter((item) => !CREATE_KEYS.has(item.key)),
        DESKTOP_WORKSPACE_ORDER,
      )
    : allWorkspaceNav;
  const createNav = isDesktop
    ? orderDesktopItems(
        allWorkspaceNav.filter((item) => CREATE_KEYS.has(item.key)),
        DESKTOP_CREATE_ORDER,
      )
    : [];

  const visibleSystemNav = BUILT_IN_SIDEBAR_ITEMS.filter(
    (item) =>
      item.section === "system" &&
      item.key !== "settings" &&
      sidebarItemVisible(item, hiddenSidebarItems),
  );
  const systemNav = isDesktop
    ? orderDesktopItems(visibleSystemNav, DESKTOP_SYSTEM_ORDER)
    : visibleSystemNav;

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
      const displayTitle = isDesktop ? desktopSidebarTitle(item) : item.title;
      return (
        <SidebarMenuItem key={item.path}>
          <SidebarMenuButton
            isActive={item.externalUrl ? false : isActive(item.path, item.exact ?? false)}
            onClick={() => navigateToItem(item)}
            tooltip={displayTitle}
            className={
              isDesktop
                ? "ob-nav-item h-10 gap-3 rounded-xl px-3 text-[13.5px] font-medium text-sidebar-foreground transition-all duration-200 hover:bg-white/55 hover:text-foreground data-[active=true]:bg-white/80 data-[active=true]:text-primary data-[active=true]:shadow-[0_1px_2px_rgba(24,73,139,.08),inset_0_0_0_1px_rgba(255,255,255,.75)]"
                : "h-7 gap-2 rounded px-2 text-[12.5px] font-normal text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
            }
          >
            <item.icon className={isDesktop ? "h-[17px] w-[17px]" : "h-3.5 w-3.5"} strokeWidth={isDesktop ? 1.8 : 2} />
            <span>{displayTitle}</span>
            {item.externalUrl && isDesktop ? (
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
    if (!item) return "Openbase";
    return item.key === "launchctl" ? "Services" : item.title;
  })();

  const commandItems = [...primaryNav, ...createNav, ...pluginNav, ...systemNav, ...settingsNav];

  return (
    <SidebarProvider
      style={{ "--sidebar-width": isDesktop ? "15.5rem" : "13rem" } as React.CSSProperties}
    >
      <div
        className={
          isDesktop
            ? `ob-desktop-shell flex h-screen min-h-0 w-full overflow-hidden ${noPadding ? "ob-workbench-route" : ""}`
            : `flex w-full bg-background ${noPadding ? "h-screen min-h-0 overflow-hidden" : "min-h-screen"}`
        }
        data-openbase-desktop={isDesktop ? "true" : undefined}
      >
        <a className="ob-skip-link" href="#openbase-main">Skip to content</a>
        <Sidebar
          collapsible={isDesktop ? "icon" : "offcanvas"}
          variant={isDesktop ? "inset" : "sidebar"}
          className={
            isDesktop
              ? "ob-desktop-sidebar border-0 bg-transparent text-sidebar-foreground"
              : "border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
          }
        >
          <SidebarHeader
            className={
              isDesktop
                ? "ob-sidebar-header px-4 pb-4 pt-12"
                : "border-b border-sidebar-border px-3 py-2.5"
            }
          >
            {isDesktop ? (
              <div className="flex h-8 items-center px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                <OpenbaseWordmark className="group-data-[collapsible=icon]:hidden" />
                <span className="hidden h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-white/72 shadow-[0_1px_2px_rgba(24,73,139,.08),inset_0_0_0_1px_rgba(255,255,255,.82)] group-data-[collapsible=icon]:flex">
                  <span className="block h-[18px] w-[18px] overflow-hidden">
                    <OpenbaseWordmark className="h-[18px] max-w-none" />
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-sidebar-accent text-sidebar-primary">
                  <Terminal className="h-3 w-3" strokeWidth={2.25} />
                </div>
                <span className="text-[12px] font-medium text-white">Openbase Coder</span>
              </div>
            )}
          </SidebarHeader>

          <SidebarContent className={isDesktop ? "px-3 pb-3" : "px-2 py-2"}>
            <SidebarGroup className={isDesktop ? "p-0" : undefined}>
              <SidebarGroupLabel
                className={
                  isDesktop
                    ? "h-8 px-3 text-[11px] font-semibold tracking-[0.04em] text-sidebar-foreground/55"
                    : "px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45"
                }
              >
                Workspace
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className={isDesktop ? "gap-1" : "gap-px"}>
                  {renderNavItems(primaryNav)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isDesktop && createNav.length > 0 ? (
              <SidebarGroup className="mt-4 p-0">
                <SidebarGroupLabel className="h-8 px-3 text-[11px] font-semibold tracking-[0.04em] text-sidebar-foreground/55">
                  Create & automate
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">{renderNavItems(createNav)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}

            {pluginNav.length > 0 ? (
              <SidebarGroup className={isDesktop ? "mt-4 p-0" : "mt-2"}>
                <SidebarGroupLabel className={isDesktop ? "h-8 px-3 text-[11px] font-semibold tracking-[0.04em] text-sidebar-foreground/55" : "px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45"}>
                  Plugins
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className={isDesktop ? "gap-1" : "gap-px"}>{renderNavItems(pluginNav)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}

            {isDesktop ? (
              <Collapsible className="mt-4 group-data-[collapsible=icon]:hidden" onOpenChange={setSystemOpen} open={systemOpen}>
                <SidebarGroup className="p-0">
                  <CollapsibleTrigger asChild>
                    <button className="flex h-8 w-full items-center rounded-lg px-3 text-[11px] font-semibold tracking-[0.04em] text-sidebar-foreground/55 hover:bg-white/35 hover:text-foreground">
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
            ) : (
              <SidebarGroup className="mt-2">
                <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                  System
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-px">{renderNavItems(systemNav)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className={isDesktop ? "gap-2 px-3 pb-3 pt-2" : "border-t border-sidebar-border px-2 py-2"}>
            {isDesktop ? (
              <button
                className="ob-command-trigger flex h-10 w-full items-center gap-3 rounded-xl border border-white/60 bg-white/45 px-3 text-left text-[13px] font-medium text-sidebar-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.65)] transition-colors hover:bg-white/70 hover:text-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                onClick={() => setCommandOpen(true)}
                type="button"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:hidden">Quick switcher</span>
                <kbd className="ml-auto rounded-md border border-white/70 bg-white/55 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">⌘K</kbd>
              </button>
            ) : null}
            <SidebarMenu className={isDesktop ? "gap-1" : "gap-px"}>{renderNavItems(settingsNav)}</SidebarMenu>
            {cliVersions?.cli ? (
              <div
                className={isDesktop ? "flex items-center gap-2 px-3 pt-1 text-[11px] text-sidebar-foreground/55 group-data-[collapsible=icon]:hidden" : "flex items-center gap-1.5 px-2 pt-1 text-[10px] text-sidebar-foreground/45"}
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

        <div className={isDesktop ? "ob-desktop-window flex min-h-0 flex-1 flex-col overflow-hidden" : `flex min-h-0 flex-1 flex-col ${noPadding ? "overflow-hidden" : "overflow-auto"}`}>
          <header className={isDesktop ? "ob-desktop-titlebar flex h-[58px] shrink-0 items-center justify-between border-b border-border/60 px-5" : "sticky top-0 z-10 flex h-9 shrink-0 items-center justify-between border-b border-border bg-background/90 px-3 backdrop-blur md:px-4"}>
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className={isDesktop ? "ob-sidebar-toggle ob-no-drag h-8 w-8 text-muted-foreground hover:bg-accent" : "md:hidden"} />
              {isDesktop ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-[-0.01em] text-foreground">{pageTitle}</p>
                  <p className="text-[11px] text-muted-foreground">Openbase on this Mac</p>
                </div>
              ) : null}
            </div>
            <div className="ob-no-drag flex items-center gap-2">
              {isDesktop ? (
                <button
                  aria-label="Open quick switcher"
                  className="hidden h-9 min-w-[210px] items-center gap-2 rounded-xl border border-border/70 bg-white/65 px-3 text-left text-[13px] text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.8)] transition-colors hover:border-primary/20 hover:bg-white lg:flex"
                  onClick={() => setCommandOpen(true)}
                  type="button"
                >
                  <Search className="h-3.5 w-3.5" />
                  Search or jump
                  <kbd className="ml-auto font-mono text-[10px]">⌘K</kbd>
                </button>
              ) : null}
              <UserProfile />
            </div>
          </header>
          <HealthWarningsBanner />
          <main
            className={isDesktop ? `${noPadding ? "min-h-0 flex-1 overflow-hidden" : "ob-desktop-main min-h-0 flex-1 overflow-auto px-8 pb-12 pt-8"}` : noPadding ? "flex-1 min-h-0 w-full" : "w-full px-5 py-5 max-w-[1100px]"}
            id="openbase-main"
          >
            {children}
          </main>
        </div>
      </div>

      {isDesktop ? (
        <>
          <DesktopCommandSwitcher
            items={commandItems}
            onNavigate={navigateToItem}
            onNewThread={() => setNewThreadOpen(true)}
            onOpenChange={setCommandOpen}
            open={commandOpen}
          />
          <NewThreadDialog onOpenChange={setNewThreadOpen} open={newThreadOpen} />
        </>
      ) : null}
    </SidebarProvider>
  );
};

export default DashboardLayout;
