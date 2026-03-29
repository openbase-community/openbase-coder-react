import type { ComponentType } from "react";

export type PluginComponentProps = {
  projectPath?: string;
  stack?: string;
  pluginId: string;
};

export type PluginProjectViewProps = {
  projectPath: string;
  stack: string;
  pluginId: string;
};

export type PluginConsolePage = {
  pluginId: string;
  key: string;
  title: string;
  route: string;
  sidebar: boolean;
  component: ComponentType<PluginComponentProps>;
};

export type PluginProjectView = {
  pluginId: string;
  stack: string;
  title: string;
  component: ComponentType<PluginProjectViewProps>;
};

const generated = import.meta.glob("./generated/pluginRegistry.ts", {
  eager: true,
}) as Record<string, { pluginConsolePages?: PluginConsolePage[]; pluginProjectViews?: PluginProjectView[] }>;

const generatedRegistry = generated["./generated/pluginRegistry.ts"];

export const pluginConsolePages: PluginConsolePage[] =
  generatedRegistry?.pluginConsolePages ?? [];

export const pluginProjectViews: PluginProjectView[] =
  generatedRegistry?.pluginProjectViews ?? [];

export function getProjectViewByStack(
  stack: string | null | undefined,
): PluginProjectView | undefined {
  if (!stack) {
    return undefined;
  }
  return pluginProjectViews.find((item) => item.stack === stack);
}
