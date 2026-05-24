import {
  Sidebar,
  SidebarContent,
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
import UserProfile from "@/components/UserProfile";
import { usePluginRegistry } from "@/plugin-registry";
import {
  Terminal,
  Zap,
} from "lucide-react";
import {
  BUILT_IN_SIDEBAR_ITEMS,
  readHiddenSidebarItems,
  sidebarItemVisible,
  SIDEBAR_PREFERENCES_EVENT,
  type SidebarItem,
} from "@/lib/sidebar-preferences";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface ExampleDashboardLayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

const ExampleDashboardLayout: React.FC<ExampleDashboardLayoutProps> = ({
  children,
  noPadding,
}) => {
  const { pluginConsolePages } = usePluginRegistry();
  const navigate = useNavigate();
  const location = useLocation();
  const [hiddenSidebarItems, setHiddenSidebarItems] = useState<string[]>(() =>
    readHiddenSidebarItems(),
  );

  useEffect(() => {
    const refresh = () => setHiddenSidebarItems(readHiddenSidebarItems());
    window.addEventListener(SIDEBAR_PREFERENCES_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SIDEBAR_PREFERENCES_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const primaryNav = BUILT_IN_SIDEBAR_ITEMS.filter(
    (item) =>
      item.section === "workspace" &&
      sidebarItemVisible(item, hiddenSidebarItems),
  );

  const systemNav = BUILT_IN_SIDEBAR_ITEMS.filter(
    (item) =>
      item.section === "system" && sidebarItemVisible(item, hiddenSidebarItems),
  );

  const pluginNav = pluginConsolePages
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

  const renderNavItems = (items: SidebarItem[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.path}>
        <SidebarMenuButton
          isActive={isActive(item.path, item.exact ?? false)}
          onClick={() => navigate(item.path)}
          tooltip={item.title}
          className="h-7 gap-2 rounded px-2 text-[12.5px] font-normal text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
        >
          <item.icon className="h-3.5 w-3.5" />
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "13rem" } as React.CSSProperties}
    >
      <div className={`flex w-full bg-background ${noPadding ? "h-screen min-h-0 overflow-hidden" : "min-h-screen"}`}>
        <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="border-b border-sidebar-border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-sidebar-accent text-sidebar-primary">
                <Terminal className="h-3 w-3" strokeWidth={2.25} />
              </div>
              <span className="text-[12px] font-medium text-white">
                Openbase Coder
              </span>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-2">
            <SidebarGroup>
              <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                Workspace
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-px">{renderNavItems(primaryNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-2">
              <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                System
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-px">{renderNavItems(systemNav)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {pluginNav.length > 0 ? (
              <SidebarGroup className="mt-2">
                <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                  Plugins
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-px">{renderNavItems(pluginNav)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}
          </SidebarContent>
        </Sidebar>

        <div
          className={`flex min-h-0 flex-1 flex-col ${noPadding ? "overflow-hidden" : "overflow-auto"}`}
        >
          <header className="sticky top-0 z-10 flex h-9 shrink-0 items-center justify-between border-b border-border bg-background/90 px-3 backdrop-blur md:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="md:hidden" />
              <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                <span className="truncate font-mono">localhost:7999</span>
              </div>
            </div>
            <UserProfile />
          </header>
          <main
            className={
              noPadding
                ? "flex-1 min-h-0 w-full"
                : "w-full px-5 py-5 max-w-[1100px]"
            }
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ExampleDashboardLayout;
