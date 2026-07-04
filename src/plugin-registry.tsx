import {
  createContext,
  useEffect,
  useMemo,
  useState,
  useContext,
  type ReactNode,
} from "react";
import { getBackendUrl } from "@/lib/runtime-config";
export type { PluginConsolePage } from "./types/plugins";
import type { PluginConsolePage } from "./types/plugins";

type PluginRegistryValue = {
  pluginConsolePages: PluginConsolePage[];
};

const PluginRegistryContext = createContext<PluginRegistryValue>({
  pluginConsolePages: [],
});

export function PluginRegistryProvider({ children }: { children: ReactNode }) {
  const [pluginConsolePages, setPluginConsolePages] = useState<
    PluginConsolePage[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    fetch(getBackendUrl("/api/plugins/console-registry/"))
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload) {
          return;
        }
        setPluginConsolePages(normalizeRuntimeConsolePages(payload));
      })
      .catch(() => {
        // Deliberately silent: plugin console pages are an optional
        // enhancement, and a startup toast here would fire on every load
        // when the local API is down (auth/login flows surface that state).
        if (!cancelled) {
          setPluginConsolePages([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ pluginConsolePages }), [pluginConsolePages]);

  return (
    <PluginRegistryContext.Provider value={value}>
      {children}
    </PluginRegistryContext.Provider>
  );
}

export function usePluginRegistry() {
  return useContext(PluginRegistryContext);
}

function normalizeRuntimeConsolePages(payload: unknown): PluginConsolePage[] {
  if (!payload || typeof payload !== "object" || !("pages" in payload)) {
    return [];
  }
  const groups = (payload as { pages?: unknown }).pages;
  if (!Array.isArray(groups)) {
    return [];
  }

  const pages: PluginConsolePage[] = [];
  for (const group of groups) {
    if (!group || typeof group !== "object") {
      continue;
    }
    const pluginId = stringValue(
      (group as { plugin_id?: unknown }).plugin_id,
    );
    const pageItems = (group as { pages?: unknown }).pages;
    if (!pluginId || !Array.isArray(pageItems)) {
      continue;
    }
    for (const item of pageItems) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const page = item as Record<string, unknown>;
      const key = stringValue(page.key);
      const title = stringValue(page.title) || key;
      const route = stringValue(page.route);
      const iframeUrl = stringValue(page.iframe_url);
      if (!key || !title || !route || !iframeUrl) {
        continue;
      }
      pages.push({
        pluginId,
        key,
        title,
        route,
        sidebar: page.sidebar !== false,
        iframeUrl,
      });
    }
  }
  return pages;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
