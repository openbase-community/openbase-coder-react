import {
  fetchMessagingContactsSummary,
  type MessagingContactsSummary,
} from "@/lib/messaging-contacts";
import { useCallback, useEffect, useState } from "react";

const POLL_MS = 60_000;
export const MESSAGING_CONTACTS_CHANGED_EVENT = "openbase-coder:messaging-contacts";

/** Tell every mounted summary (the review prompt) that assignments changed. */
export function notifyMessagingContactsChanged() {
  window.dispatchEvent(new Event(MESSAGING_CONTACTS_CHANGED_EVENT));
}

/**
 * Progress counts for the contact review, polled slowly. The summary endpoint
 * serves the cached index so polling never reaches a remote archive host.
 */
export function useMessagingContactsSummary(enabled = true) {
  const [summary, setSummary] = useState<MessagingContactsSummary | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSummary(await fetchMessagingContactsSummary());
    } catch {
      // A missing or unreachable backend just hides the prompt.
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const interval = window.setInterval(() => void refresh(), POLL_MS);
    const onChange = () => void refresh();
    window.addEventListener(MESSAGING_CONTACTS_CHANGED_EVENT, onChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(MESSAGING_CONTACTS_CHANGED_EVENT, onChange);
    };
  }, [enabled, refresh]);

  return { summary, refresh };
}
