import { Button } from "@/components/ui/button";
import { useMessagingContactsSummary } from "@/hooks/useMessagingContactsSummary";
import { CONTACTS_PATH, progressLabel } from "@/lib/messaging-contacts";
import { Users } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const SNOOZE_KEY = "openbase-coder:contact-review-snoozed";

function readSnoozed(): boolean {
  try {
    return window.sessionStorage.getItem(SNOOZE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Keeps asking the user to categorize messaging contacts until none are
 * pending. "Later" hides it for this browser session only; new contacts and
 * expired skips bring it back.
 */
export function ContactReviewPrompt() {
  const location = useLocation();
  const navigate = useNavigate();
  const [snoozed, setSnoozed] = useState(readSnoozed);
  const onContactsPage = location.pathname.startsWith(CONTACTS_PATH);
  const { summary } = useMessagingContactsSummary(!onContactsPage && !snoozed);

  if (onContactsPage || snoozed || !summary) return null;
  const pending = summary.progress.pending - summary.progress.skipped;
  if (pending <= 0) return null;

  const snooze = () => {
    try {
      window.sessionStorage.setItem(SNOOZE_KEY, "1");
    } catch {
      // Session storage may be unavailable; the prompt simply stays.
    }
    setSnoozed(true);
  };

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-surface-muted px-4 py-2 text-[12px] text-foreground"
    >
      <Users className="h-3.5 w-3.5 shrink-0 text-info" strokeWidth={1.9} />
      <span className="min-w-0 flex-1">
        {pending === 1
          ? "1 messaging contact needs a category"
          : `${pending} messaging contacts need a category`}
        <span className="text-muted-foreground"> · {progressLabel(summary.progress)}</span>
      </span>
      <Button size="sm" className="h-7 px-2.5 text-[12px]" onClick={() => navigate(CONTACTS_PATH)}>
        Review contacts
      </Button>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-[12px]" onClick={snooze}>
        Later
      </Button>
    </div>
  );
}
