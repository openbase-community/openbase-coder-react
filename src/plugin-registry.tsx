import {
  createContext,
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
  return (
    <PluginRegistryContext.Provider
      value={{ pluginConsolePages, pluginProjectViews }}
    >
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
