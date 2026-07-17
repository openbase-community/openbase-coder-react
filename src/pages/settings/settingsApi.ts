export type IgnoredLaunchctlLabelsResponse = {
  ignored_labels: string[];
};

export type DangerousConfirmationSettingsResponse = {
  dangerous_confirmation_phrase: string;
  default_dangerous_confirmation_phrase: string;
  user_address_name: string;
  default_user_address_name: string;
  refreshed: boolean;
};

export type AgentsGenerationSettingsResponse = {
  include_normal_codex_agents_in_openbase_agents: boolean;
  default_include_normal_codex_agents_in_openbase_agents: boolean;
  refreshed: boolean;
};

export type KeepAwakeSettingsResponse = {
  keep_system_awake: boolean;
  default_keep_system_awake: boolean;
  restart_required: boolean;
  restart_hint: string;
};

export type OpenbaseService = {
  name: string;
  label: string;
  description: string;
  port: number | null;
  installed: boolean;
  running: boolean;
  pid: string | null;
  last_exit_code: string | null;
  optional: boolean;
};

export type OpenbaseServicesResponse = {
  services: OpenbaseService[];
  scheduled?: boolean;
  restart?: {
    services: string[];
    recreate_dispatcher: boolean;
    interrupts_voice: boolean;
    delay_seconds: number;
  };
};

export type CodingBackendOption = {
  id: string;
  label: string;
  summary: string;
  description: string;
};

export type ClaudeAuthSettingsResponse = {
  command: string;
  logged_in: boolean;
  raw_output: string;
  returncode: number;
  state_updated: boolean;
  keychain_copied: boolean;
  message: string | null;
};

export type CodingBackendSettingsResponse = {
  backend: string;
  configured_backend?: string;
  codex_provider?: string;
  backend_note?: string | null;
  claude_auth?: ClaudeAuthSettingsResponse;
  default_backend: string;
  supported_backends: CodingBackendOption[];
  env_file_exists: boolean;
  changed: boolean;
  restart_required: boolean;
  restart_hint: string;
};

export type CodexPluginSetting = {
  id: string;
  plugin_id: string;
  label: string;
  description: string;
  installed: boolean;
  enabled: boolean;
  version: string | null;
};

export type CodexPluginSettingsResponse = {
  backend: string;
  codex_home: string;
  plugins: CodexPluginSetting[];
  changed: boolean;
  changed_plugin: string | null;
  restart_required: boolean;
  restart_hint: string;
};

export type ClaudePluginSettingsResponse = {
  backend: string;
  claude_config_dir: string;
  plugins: CodexPluginSetting[];
  changed: boolean;
  changed_plugin: string | null;
  restart_required: boolean;
  restart_hint: string;
};

export type BackendModelOption = {
  id: string;
  label: string;
  description: string;
};

export type BackendModelSettingsResponse = {
  backend: string;
  models: {
    dispatcher: string | null;
    super_agents: string | null;
  };
  effective: {
    dispatcher: string;
    super_agents: string;
  };
  options: BackendModelOption[];
  allows_custom: boolean;
  config_path: string;
  changed: boolean;
  restart_required: boolean;
  restart_hint: string;
};

export type ReasoningEffort = "low" | "medium" | "high" | "xhigh";

export type ReasoningSettingsResponse = {
  dispatcher_reasoning_effort: ReasoningEffort | null;
  super_agents_reasoning_effort: ReasoningEffort | null;
  effective: {
    dispatcher_reasoning_effort: string;
    super_agents_reasoning_effort: string;
  };
  options: ReasoningEffort[];
  config_path: string;
  config_exists: boolean;
  changed: boolean;
  restart_required: boolean;
  restart_hint: string;
};

export type ServiceTier = "fast" | "standard";

export type ServiceTierOption = {
  id: ServiceTier;
  label: string;
  summary: string;
};

export type ServiceTierSettingsResponse = {
  dispatcher_service_tier: ServiceTier;
  super_agents_service_tier: ServiceTier;
  effective: {
    dispatcher_service_tier: string;
    super_agents_service_tier: string;
  };
  defaults: {
    dispatcher_service_tier: ServiceTier;
    super_agents_service_tier: ServiceTier;
  };
  options: ServiceTierOption[];
  config_path: string;
  config_exists: boolean;
  env_file_exists: boolean;
  changed: boolean;
  restart_required: boolean;
  restart_hint: string;
};

export type TTSProvider = {
  id: string;
  name: string;
  local: boolean;
};

export type TTSVoice = {
  id: string;
  name: string;
  provider: string;
  language: string;
  country: string | null;
  gender: string | null;
};

export type DispatcherVoice = {
  id: string;
  name: string;
  provider?: string;
};

export type LocalTTSDownload = {
  provider: string;
  ready: boolean;
  required_files: number;
  cached_files: number;
  detail: string | null;
};

export type STTProvider = {
  id: string;
  name: string;
  local: boolean;
  model: string | null;
};

export type LocalSTTDownload = {
  provider: string;
  ready: boolean;
  model: string;
  detail: string | null;
};

export type TTSSettingsResponse = {
  provider: string;
  providers: TTSProvider[];
  voices: TTSVoice[];
  voices_by_provider: Record<string, TTSVoice[]>;
  dispatcher_voice: DispatcherVoice;
  local_download: LocalTTSDownload;
};

export type STTSettingsResponse = {
  provider: string;
  providers: STTProvider[];
  local_download: LocalSTTDownload;
};

export type DispatcherVoiceUpdateResponse = {
  dispatcher_voice: DispatcherVoice;
};

export type EnvSettingsEntry = {
  key: string;
  value: string;
  secret: boolean;
};

export type EnvSettingsResponse = {
  env_file_exists: boolean;
  entries: EnvSettingsEntry[];
  common_keys: string[];
  changed: boolean;
  restart_required: boolean;
  restart_hint: string;
};

export const extractErrorMessage = async (
  res: Response,
  fallback: string,
): Promise<string> => {
  try {
    const data = (await res.json()) as { error?: string; detail?: string };
    return data.error ?? data.detail ?? fallback;
  } catch {
    return fallback;
  }
};
