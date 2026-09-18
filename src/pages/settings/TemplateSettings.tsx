import { Panel } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import {
  fetchBoilerSyncTemplates,
  setBoilerSyncFeaturedPromptDismissed,
} from "@/lib/boilersync";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function TemplateSettings() {
  const [showFeaturedPrompt, setShowFeaturedPrompt] = useState(false);
  const [featuredInstalled, setFeaturedInstalled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSetting = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBoilerSyncTemplates();
      setShowFeaturedPrompt(!data.featured_source.prompt_dismissed);
      setFeaturedInstalled(data.featured_source.installed);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Unable to load template preferences.",
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSetting();
  }, [loadSetting]);

  const updateSetting = async (show: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      const data = await setBoilerSyncFeaturedPromptDismissed(!show);
      setShowFeaturedPrompt(!data.featured_source.prompt_dismissed);
      setFeaturedInstalled(data.featured_source.installed);
      toast.success(
        show ? "Featured suggestion restored" : "Featured suggestion hidden",
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Unable to update template preferences.",
      );
    }
    setSaving(false);
  };

  return (
    <Panel>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-foreground">
            Featured template suggestion
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {featuredInstalled
              ? "The suggestion stays hidden while Openbase community templates are installed."
              : "Show the Openbase community templates import option on the Templates page."}
          </p>
        </div>
        <Switch
          aria-label="Show featured template suggestion"
          checked={showFeaturedPrompt}
          disabled={loading || saving}
          onCheckedChange={(checked) => void updateSetting(checked)}
        />
      </div>
    </Panel>
  );
}
