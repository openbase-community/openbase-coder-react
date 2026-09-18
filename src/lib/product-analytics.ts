export type ProductAnalyticsEventName =
  | "approval_resolved"
  | "voice_call_started"
  | "voice_call_connected"
  | "voice_call_ended"
  | "diff_reviewed";

export type ProductAnalyticsProperty = string | number | boolean | null;
export type ProductAnalyticsProperties = Record<
  string,
  ProductAnalyticsProperty | undefined
>;

export interface ProductAnalyticsSink {
  track(
    eventType: ProductAnalyticsEventName,
    properties?: ProductAnalyticsProperties,
  ): void;
}

// Must remain a subset of the canonical taxonomy in the Openbase Cloud API.
const ALLOWED_PROPERTY_KEYS = new Set([
  "action",
  "call_id",
  "connect_duration_ms",
  "connected",
  "decision",
  "direction",
  "duration_ms",
  "error_code",
  "outcome",
  "request_type",
  "response_duration_ms",
]);

/**
 * Shell-owned control over whether product analytics collection is enabled.
 * Registered by shells (e.g. the desktop app) that collect opt-out analytics
 * so the shared Settings page can expose the toggle; when absent, no
 * analytics preference UI is rendered.
 */
export interface ProductAnalyticsPreference {
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
}

let sink: ProductAnalyticsSink | null = null;
let preference: ProductAnalyticsPreference | null = null;

export function configureProductAnalytics(
  nextSink: ProductAnalyticsSink | null,
): void {
  sink = nextSink;
}

export function configureProductAnalyticsPreference(
  nextPreference: ProductAnalyticsPreference | null,
): void {
  preference = nextPreference;
}

export function getProductAnalyticsPreference(): ProductAnalyticsPreference | null {
  return preference;
}

export function trackProductAnalytics(
  eventType: ProductAnalyticsEventName,
  properties: ProductAnalyticsProperties = {},
): void {
  if (!sink) return;
  const sanitized = Object.fromEntries(
    Object.entries(properties).filter(
      ([key, value]) =>
        ALLOWED_PROPERTY_KEYS.has(key) &&
        value !== undefined &&
        (value === null ||
          typeof value === "string" ||
          (typeof value === "number" && Number.isFinite(value)) ||
          typeof value === "boolean"),
    ),
  ) as Record<string, ProductAnalyticsProperty>;
  sink.track(eventType, sanitized);
}
