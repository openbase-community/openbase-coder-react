import { Switch } from "@/components/ui/switch";
import {
  BUILT_IN_SIDEBAR_ITEMS,
  readHiddenSidebarItems,
  sidebarItemVisible,
  SIDEBAR_PREFERENCES_EVENT,
  writeHiddenSidebarItems,
  type SidebarItem,
} from "@/lib/sidebar-preferences";
import { usePluginRegistry } from "@/plugin-registry";
import { Square } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

export const SidebarItemsSettings: React.FC = () => {
  const { pluginConsolePages } = usePluginRegistry();
  const [hiddenSidebarItems, setHiddenSidebarItems] = useState<string[]>(() =>
    readHiddenSidebarItems(),
  );

  useEffect(() => {
    const refreshSidebarPreferences = () =>
      setHiddenSidebarItems(readHiddenSidebarItems());
    window.addEventListener(SIDEBAR_PREFERENCES_EVENT, refreshSidebarPreferences);
    window.addEventListener("storage", refreshSidebarPreferences);
    return () => {
      window.removeEventListener(
        SIDEBAR_PREFERENCES_EVENT,
        refreshSidebarPreferences,
      );
      window.removeEventListener("storage", refreshSidebarPreferences);
    };
  }, []);

  const sidebarPreferenceItems = useMemo<SidebarItem[]>(() => {
    const pluginItems: SidebarItem[] = pluginConsolePages
      .filter((page) => page.sidebar)
      .map((page) => ({
        key: `plugin:${page.pluginId}:${page.key}`,
        path: page.route,
        icon: Square,
        title: page.title,
        section: "plugins",
      }));
    return [...BUILT_IN_SIDEBAR_ITEMS, ...pluginItems];
  }, [pluginConsolePages]);

  const handleSidebarVisibilityChange = useCallback(
    (item: SidebarItem, visible: boolean) => {
      if (item.locked) {
        return;
      }
      const nextHiddenItems = visible
        ? hiddenSidebarItems.filter((key) => key !== item.key)
        : [...hiddenSidebarItems, item.key];
      writeHiddenSidebarItems(nextHiddenItems);
      setHiddenSidebarItems(readHiddenSidebarItems());
    },
    [hiddenSidebarItems],
  );

  const sidebarItemsBySection = useMemo(
    () => ({
      workspace: sidebarPreferenceItems.filter(
        (item) => item.section === "workspace",
      ),
      system: sidebarPreferenceItems.filter((item) => item.section === "system"),
      plugins: sidebarPreferenceItems.filter(
        (item) => item.section === "plugins",
      ),
    }),
    [sidebarPreferenceItems],
  );

  const renderSidebarPreferenceRows = (items: SidebarItem[]) =>
    items.map((item) => {
      const visible = sidebarItemVisible(item, hiddenSidebarItems);
      return (
        <div
          key={item.key}
          className="flex min-w-0 items-center gap-3 px-3 py-2.5"
        >
          <item.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-foreground">
              {item.title}
            </p>
            <p className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">
              {item.path}
            </p>
          </div>
          <Switch
            checked={visible}
            disabled={item.locked}
            onCheckedChange={(checked) =>
              handleSidebarVisibilityChange(item, checked)
            }
            aria-label={`${visible ? "Hide" : "Show"} ${item.title}`}
          />
        </div>
      );
    });

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="border-b border-border px-3 py-2.5">
        <p className="text-[12.5px] font-medium text-foreground">
          Sidebar items
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Settings stays visible.
        </p>
      </div>
      <div className="divide-y divide-border">
        <div>
          <div className="bg-background/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </div>
          <div className="divide-y divide-border">
            {renderSidebarPreferenceRows(sidebarItemsBySection.workspace)}
          </div>
        </div>
        <div>
          <div className="bg-background/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            System
          </div>
          <div className="divide-y divide-border">
            {renderSidebarPreferenceRows(sidebarItemsBySection.system)}
          </div>
        </div>
        {sidebarItemsBySection.plugins.length > 0 ? (
          <div>
            <div className="bg-background/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Plugins
            </div>
            <div className="divide-y divide-border">
              {renderSidebarPreferenceRows(sidebarItemsBySection.plugins)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
