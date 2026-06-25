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
  component?: ComponentType<PluginComponentProps>;
  render?: "component" | "iframe";
  iframeUrl?: string;
};

export type PluginProjectView = {
  pluginId: string;
  stack: string;
  title: string;
  component: ComponentType<PluginProjectViewProps>;
};
