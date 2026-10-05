export type ApprovalReviewMode = "list" | "cards";

// Feature flag for the card-swipe approvals interface. Enabled by default so
// the settings toggle is discoverable; setting the storage key to "off" is the
// kill switch (hides the toggle and forces the classic list).
export const APPROVALS_CARD_SWIPE_FEATURE_STORAGE_KEY =
  "openbase-coder:feature:approvals-card-swipe";

export const APPROVAL_REVIEW_MODE_STORAGE_KEY =
  "openbase-coder:approval-review-mode";
export const APPROVAL_REVIEW_PREFERENCES_EVENT =
  "openbase-coder:approval-review-preferences";

export function approvalsCardSwipeFeatureEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem(APPROVALS_CARD_SWIPE_FEATURE_STORAGE_KEY) !==
      "off"
    );
  } catch {
    return false;
  }
}

/** The stored review mode, forced to "list" while the feature flag is off. */
export function readApprovalReviewMode(): ApprovalReviewMode {
  if (!approvalsCardSwipeFeatureEnabled()) return "list";
  try {
    const raw = window.localStorage.getItem(APPROVAL_REVIEW_MODE_STORAGE_KEY);
    return raw === "cards" ? "cards" : "list";
  } catch {
    return "list";
  }
}

export function writeApprovalReviewMode(mode: ApprovalReviewMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APPROVAL_REVIEW_MODE_STORAGE_KEY, mode);
  window.dispatchEvent(
    new CustomEvent(APPROVAL_REVIEW_PREFERENCES_EVENT, { detail: mode }),
  );
}
