import { Panel } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import {
  APPROVAL_REVIEW_PREFERENCES_EVENT,
  approvalsCardSwipeFeatureEnabled,
  readApprovalReviewMode,
  writeApprovalReviewMode,
} from "@/lib/approval-review-preferences";
import React, { useEffect, useState } from "react";

export const ApprovalReviewSettings: React.FC = () => {
  const [mode, setMode] = useState(() => readApprovalReviewMode());

  useEffect(() => {
    const refresh = () => setMode(readApprovalReviewMode());
    window.addEventListener(APPROVAL_REVIEW_PREFERENCES_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(APPROVAL_REVIEW_PREFERENCES_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (!approvalsCardSwipeFeatureEnabled()) return null;

  return (
    <Panel>
      <div className="flex min-w-0 items-center gap-3 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Card swipe review
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Review approvals one at a time as swipeable cards — swipe right to
            approve, left to decline. Off keeps the classic list.
          </p>
        </div>
        <Switch
          checked={mode === "cards"}
          onCheckedChange={(checked) =>
            writeApprovalReviewMode(checked ? "cards" : "list")
          }
          aria-label="Enable card swipe approval review"
        />
      </div>
    </Panel>
  );
};
