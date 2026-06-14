export type IgnoredLaunchctlLabelsResponse = {
  ignored_labels: string[];
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
