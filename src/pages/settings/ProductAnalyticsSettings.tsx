import { Panel } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import {
  isProductAnalyticsEnabled,
  productAnalyticsPreferenceAvailable,
  setProductAnalyticsEnabled,
} from "@/lib/product-analytics";
import { useState } from "react";

export function ProductAnalyticsSettings() {
  const available = productAnalyticsPreferenceAvailable();
  const [enabled, setEnabled] = useState(isProductAnalyticsEnabled);

  if (!available) return null;

  return (
    <Panel>
      <div className="flex items-start gap-3 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Share anonymous product usage
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Off until you opt in. Never includes prompts, code, audio, file
            paths, repository content, email addresses, or usernames.
          </p>
        </div>
        <Switch
          aria-label="Share anonymous product usage"
          checked={enabled}
          onCheckedChange={(nextEnabled) => {
            setProductAnalyticsEnabled(nextEnabled);
            setEnabled(isProductAnalyticsEnabled());
          }}
        />
      </div>
    </Panel>
  );
}
