import { Panel } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import { getProductAnalyticsPreference } from "@/lib/product-analytics";
import React, { useState } from "react";

/**
 * Opt-out toggle for anonymous product usage analytics. Renders only when the
 * hosting shell registered a ProductAnalyticsPreference (e.g. the desktop
 * app); web consoles without a shell-level preference show nothing.
 */
export const ProductAnalyticsSettings: React.FC = () => {
  const preference = getProductAnalyticsPreference();
  const [enabled, setEnabled] = useState(() =>
    preference ? preference.isEnabled() : false,
  );

  if (!preference) return null;

  return (
    <Panel>
      <div className="border-b border-border px-3 py-2.5">
        <p className="text-[12.5px] font-medium text-foreground">
          Product analytics
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Anonymous usage events that help improve Openbase.
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <p className="text-[12px] text-muted-foreground">
          Share anonymous product usage. Never includes prompts, code, audio,
          file paths, or repository content.
        </p>
        <Switch
          checked={enabled}
          onCheckedChange={(next) => {
            preference.setEnabled(next);
            setEnabled(preference.isEnabled());
          }}
        />
      </div>
    </Panel>
  );
};
