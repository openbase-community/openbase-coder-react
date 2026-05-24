import {
  getProjectViewByStack as findProjectViewByStack,
  resolvePluginRegistry,
  type PluginConsolePage,
  type PluginProjectView,
  type PluginRegistryModule,
} from "./plugin-registry";

const generated = import.meta.glob("./generated/pluginRegistry.ts", {
  eager: true,
}) as Record<string, PluginRegistryModule>;

const registry = resolvePluginRegistry(generated, "./generated/pluginRegistry.ts");

export const pluginConsolePages: PluginConsolePage[] =
  registry.pluginConsolePages;

export const pluginProjectViews: PluginProjectView[] =
  registry.pluginProjectViews;

export function getProjectViewByStack(
  stack: string | null | undefined,
): PluginProjectView | undefined {
  return findProjectViewByStack(pluginProjectViews, stack);
}
