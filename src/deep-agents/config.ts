export interface StandaloneConfig {
  deploymentUrl: string;
  assistantId: string;
}

export const DEFAULT_AGENT_CONFIG: StandaloneConfig = {
  deploymentUrl: "http://localhost:2024",
  assistantId: "coder",
};

export function getConfig(): StandaloneConfig {
  return DEFAULT_AGENT_CONFIG;
}

export function saveConfig(config: StandaloneConfig): void {
  void config;
}
