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

export type CartesiaVoice = {
  id: string;
  name: string;
  language: string;
  country: string | null;
  gender: string | null;
};

export type DispatcherVoice = {
  id: string;
  name: string;
};

export type CartesiaVoiceSettingsResponse = {
  voices: CartesiaVoice[];
  dispatcher_voice: DispatcherVoice;
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
