import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type {
  PluginConsolePage,
  PluginProjectView,
} from "./types/plugins";

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
