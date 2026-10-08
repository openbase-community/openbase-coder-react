import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useServiceHealth } from "@/hooks/useServiceHealth";
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
import { cn } from "@/lib/utils";
import { usePluginRegistry } from "@/plugin-registry";
import {
  AlertTriangle,
  ArrowUpRight,
  Ellipsis,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function useHiddenSidebarItems() {
  const [hidden, setHidden] = useState<string[]>(() =>
    readHiddenSidebarItems(),
  );
  useEffect(() => {
    const refresh = () => setHidden(readHiddenSidebarItems());
    window.addEventListener(SIDEBAR_PREFERENCES_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SIDEBAR_PREFERENCES_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return hidden;
}

/** Rail destinations: ordered workspace items, then plugin pages. */
export function railItems(
  hidden: string[],
  pluginItems: SidebarItem[],
): SidebarItem[] {
  return [
    ...orderNavigationItems(
      BUILT_IN_SIDEBAR_ITEMS.filter(
        (item) =>
          item.section === "workspace" && sidebarItemVisible(item, hidden),
      ),
      WORKSPACE_ORDER,
    ),
    ...pluginItems.filter((item) => sidebarItemVisible(item, hidden)),
  ];
}

/** Items behind the rail's "More" menu: the system destinations. */
export function railMoreItems(hidden: string[]): SidebarItem[] {
  return orderNavigationItems(
    BUILT_IN_SIDEBAR_ITEMS.filter(
      (item) =>
        item.section === "system" &&
        item.key !== "settings" &&
        item.key !== "cloud" &&
        sidebarItemVisible(item, hidden),
    ),
    SYSTEM_ORDER,
  );
}

/** Items pinned to the end of the rail: Cloud (external) then Settings. */
export function railFooterItems(hidden: string[]): SidebarItem[] {
  return BUILT_IN_SIDEBAR_ITEMS.filter(
    (item) =>
      (item.key === "cloud" || item.key === "settings") &&
      sidebarItemVisible(item, hidden),
  ).sort((a, b) => (a.key === "cloud" ? -1 : b.key === "cloud" ? 1 : 0));
}

export function isSidebarItemActive(item: SidebarItem, pathname: string) {
  const matches = (path: string, exact?: boolean) =>
    exact ? pathname === path : pathname.startsWith(path);
  if (item.externalUrl) return false;
  return (
    matches(item.path, item.exact ?? false) ||
    (item.activePaths ?? []).some((path) => matches(path))
  );
}

const railButtonClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-primary";

function RailButton({
  title,
  icon: Icon,
  active = false,
  onClick,
  badge,
  tooltipSide,
  ...props
}: {
  title: string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
  badge?: ReactNode;
  tooltipSide: "right" | "bottom";
} & Omit<React.ComponentProps<"button">, "title" | "onClick">) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={title}
          data-active={active}
          onClick={onClick}
          className={cn(railButtonClass, "relative")}
          {...props}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
          {badge}
        </button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide} className="text-[11.5px]">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The narrow meta-navigation column at the far left of the shell: one icon
 * per destination, with system pages behind "More". Vertical beside the
 * threads sidebar; horizontal at the top of the mobile sheet.
 */
export function NavRail({
  orientation = "vertical",
  onNavigate,
  className,
}: {
  orientation?: "vertical" | "horizontal";
  /** Called after any navigation, e.g. to close the mobile sheet. */
  onNavigate?: () => void;
  className?: string;
}) {
  const { pluginConsolePages } = usePluginRegistry();
  const navigate = useNavigate();
  const location = useLocation();
  const hidden = useHiddenSidebarItems();
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

  const pluginItems: SidebarItem[] = pluginConsolePages
    .filter((page) => page.sidebar)
    .map((page) => ({
      key: `plugin:${page.pluginId}:${page.key}`,
      path: page.route,
      icon: Zap,
      title: page.title,
      section: "plugins" as const,
    }));
  const primary = railItems(hidden, pluginItems);
  const more = railMoreItems(hidden);
  const footer = railFooterItems(hidden);
  const vertical = orientation === "vertical";
  const tooltipSide = vertical ? "right" : "bottom";

  const go = (item: SidebarItem) => {
    if (item.externalUrl) {
      void openExternalUrl(item.externalUrl);
    } else {
      navigate(item.path);
    }
    onNavigate?.();
  };

  const renderItem = (item: SidebarItem) => (
    <RailButton
      key={item.key}
      title={navigationTitle(item)}
      icon={item.icon}
      active={isSidebarItemActive(item, location.pathname)}
      onClick={() => go(item)}
      tooltipSide={tooltipSide}
    />
  );

  return (
    <nav
      aria-label="Main"
      data-orientation={orientation}
      className={cn(
        "flex shrink-0 items-center gap-1",
        vertical ? "w-12 flex-col py-2" : "flex-row flex-wrap px-2 py-1.5",
        className,
      )}
    >
      {primary.map(renderItem)}
      {more.length > 0 ? (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More"
                  data-active={more.some((item) =>
                    isSidebarItemActive(item, location.pathname),
                  )}
                  className={cn(railButtonClass, "relative")}
                >
                  <Ellipsis className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  {servicesDegraded ? (
                    <AlertTriangle
                      aria-label="Some required services are not running"
                      className="absolute right-1 top-1 h-3 w-3 text-warning"
                    />
                  ) : null}
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} className="text-[11.5px]">
              More
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent
            side={vertical ? "right" : "bottom"}
            align={vertical ? "end" : "start"}
            className="min-w-48"
          >
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              System
            </DropdownMenuLabel>
            {serviceSummary ? (
              <DropdownMenuItem
                onSelect={() => go(BUILT_IN_SIDEBAR_ITEMS.find((item) => item.key === "status")!)}
                className={cn(
                  "text-[11px]",
                  servicesDegraded ? "text-destructive" : "text-success",
                )}
                title={
                  serviceHealth.unhealthy.length
                    ? `Not running: ${serviceHealth.unhealthy.join(", ")}`
                    : "Open Status"
                }
              >
                {serviceSummary}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            {more.map((item) => (
              <DropdownMenuItem
                key={item.key}
                onSelect={() => go(item)}
                className="gap-2.5 text-[12.5px]"
                data-active={isSidebarItemActive(item, location.pathname)}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.9} />
                {navigationTitle(item)}
                {item.key === "status" && servicesDegraded ? (
                  <AlertTriangle className="ml-auto h-3.5 w-3.5 text-warning" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {vertical ? <div className="flex-1" /> : null}
      {footer.map((item) => (
        <RailButton
          key={item.key}
          title={navigationTitle(item)}
          icon={item.icon}
          active={isSidebarItemActive(item, location.pathname)}
          onClick={() => go(item)}
          tooltipSide={tooltipSide}
          badge={
            item.externalUrl ? (
              <ArrowUpRight className="absolute right-1 top-1 h-2.5 w-2.5 opacity-50" />
            ) : null
          }
        />
      ))}
    </nav>
  );
}
