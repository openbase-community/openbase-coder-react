import {
  createContext,
  useEffect,
  useMemo,
  useState,
  useContext,
  type ReactNode,
} from "react";
export type {
  PluginConsolePage,
  PluginProjectView,
} from "./types/plugins";
import type {
  PluginConsolePage,
  PluginProjectView,
} from "./types/plugins";

export type PluginRegistryModule = {
  pluginConsolePages?: PluginConsolePage[];
  pluginProjectViews?: PluginProjectView[];
};

type PluginRegistryValue = {
  pluginConsolePages: PluginConsolePage[];
  pluginProjectViews: PluginProjectView[];
};

const PluginRegistryContext = createContext<PluginRegistryValue>({
  pluginConsolePages: [],
  pluginProjectViews: [],
});

export function PluginRegistryProvider({
  children,
  pluginConsolePages,
  pluginProjectViews,
}: PluginRegistryValue & { children: ReactNode }) {
  const [runtimeConsolePages, setRuntimeConsolePages] = useState<
    PluginConsolePage[]
  >([]);
  const [runtimeProjectViews, setRuntimeProjectViews] = useState<
    PluginProjectView[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/plugins/console-registry/")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload) {
          return;
        }
        setRuntimeConsolePages(normalizeRuntimeConsolePages(payload));
        setRuntimeProjectViews([]);
      })
      .catch(() => {
        if (!cancelled) {
          setRuntimeConsolePages([]);
          setRuntimeProjectViews([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      pluginConsolePages: mergeConsolePages(
        pluginConsolePages,
        runtimeConsolePages,
      ),
      pluginProjectViews: [...pluginProjectViews, ...runtimeProjectViews],
    }),
    [
      pluginConsolePages,
      pluginProjectViews,
      runtimeConsolePages,
      runtimeProjectViews,
    ],
  );

  return (
    <PluginRegistryContext.Provider value={value}>
      {children}
    </PluginRegistryContext.Provider>
  );
}

export function usePluginRegistry() {
  return useContext(PluginRegistryContext);
}

export function resolvePluginRegistry(
  generated: Record<string, PluginRegistryModule>,
  registryPath: string,
): PluginRegistryValue {
  const generatedRegistry = generated[registryPath];
  return {
    pluginConsolePages: generatedRegistry?.pluginConsolePages ?? [],
    pluginProjectViews: generatedRegistry?.pluginProjectViews ?? [],
  };
}

export function getProjectViewByStack(
  pluginProjectViews: PluginProjectView[],
  stack: string | null | undefined,
): PluginProjectView | undefined {
  if (!stack) {
    return undefined;
  }
  return pluginProjectViews.find((item) => item.stack === stack);
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
      const render = stringValue(page.render);
      if (!key || !title || !route || render !== "iframe" || !iframeUrl) {
        continue;
      }
      pages.push({
        pluginId,
        key,
        title,
        route,
        sidebar: page.sidebar !== false,
        render: "iframe",
        iframeUrl,
      });
    }
  }
  return pages;
}

function mergeConsolePages(
  compiledPages: PluginConsolePage[],
  runtimePages: PluginConsolePage[],
): PluginConsolePage[] {
  const byKey = new Map<string, PluginConsolePage>();
  for (const page of compiledPages) {
    byKey.set(`${page.pluginId}:${page.key}`, page);
  }
  for (const page of runtimePages) {
    byKey.set(`${page.pluginId}:${page.key}`, page);
  }
  return [...byKey.values()];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
