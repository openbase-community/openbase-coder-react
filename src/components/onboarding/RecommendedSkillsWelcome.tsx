import { useAuth } from "@/contexts/auth";
import { apiFetch } from "@/lib/api";
import {
  fetchMarketplaceSkillsCatalog,
  installMarketplaceSkill,
  type MarketplaceSkillEntry,
} from "@/lib/marketplace";
import { CheckCircle2, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface PromptFlag {
  dismissedAt: string | null;
}

const fetchPromptFlag = async (): Promise<PromptFlag | null> => {
  try {
    const res = await apiFetch("/api/marketplace/recommended-prompt/");
    if (!res.ok) return null;
    return (await res.json()) as PromptFlag;
  } catch {
    return null;
  }
};

const dismissPromptFlag = async (): Promise<void> => {
  try {
    await apiFetch("/api/marketplace/recommended-prompt/", {
      method: "PATCH",
      body: JSON.stringify({ dismissedAt: new Date().toISOString() }),
    });
  } catch {
    // Older CLI without the flag endpoint — nothing to persist.
  }
};

const RecommendedSkillsWelcome = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [featured, setFeatured] = useState<MarketplaceSkillEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let cancelled = false;
    void (async () => {
      const flag = await fetchPromptFlag();
      if (cancelled || !flag || flag.dismissedAt) return;
      let catalog;
      try {
        catalog = await fetchMarketplaceSkillsCatalog();
      } catch {
        return;
      }
      if (cancelled) return;
      const entries = catalog.entries
        .filter((entry) => entry.featured)
        .sort((a, b) => a.featured_rank - b.featured_rank);
      if (entries.length === 0) return;
      setFeatured(entries);
      setSelected(
        new Set(
          entries
            .filter((entry) => entry.kind === "skill" && !entry.installed)
            .map((entry) => entry.slug),
        ),
      );
      setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  const close = useCallback(async () => {
    setVisible(false);
    await dismissPromptFlag();
  }, []);

  const toggle = (slug: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const installSelected = async () => {
    setInstalling(true);
    const slugs = featured
      .filter((entry) => entry.kind === "skill" && selected.has(entry.slug))
      .map((entry) => entry.slug);
    let installed = 0;
    for (const slug of slugs) {
      try {
        await installMarketplaceSkill(slug);
        installed += 1;
        toast.success(`Installed /${slug}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : `Failed to install /${slug}`,
        );
      }
    }
    setInstalling(false);
    if (installed > 0) {
      toast.success(`Set up ${installed} skill${installed === 1 ? "" : "s"}`);
    }
    await close();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-background p-6">
      <div className="w-full max-w-xl space-y-5">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
            <Sparkles className="h-5 w-5 text-foreground" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Set up your assistant's most popular skills
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Give your agent superpowers for email, meeting notes, and more.
            Skills install for Claude Code and Codex together. You can change
            these anytime under Skills.
          </p>
        </div>

        <div className="divide-y divide-border overflow-hidden rounded border border-border bg-surface">
          {featured.map((entry) => {
            const installable = entry.kind === "skill";
            return (
              <label
                key={entry.slug}
                className={`flex items-start gap-3 px-4 py-3 ${
                  installable ? "cursor-pointer hover:bg-surface-muted" : ""
                }`}
              >
                {installable ? (
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    checked={entry.installed || selected.has(entry.slug)}
                    disabled={entry.installed || installing}
                    onChange={() => toggle(entry.slug)}
                  />
                ) : (
                  <span className="mt-0.5 h-4 w-4" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-medium text-foreground">
                      {entry.name}
                    </span>
                    {entry.installed ? (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3" /> installed
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
                    {entry.tagline || entry.description}
                  </span>
                  {!installable && entry.docs_url ? (
                    <a
                      href={entry.docs_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-info hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Setup instructions
                    </a>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="h-8 rounded px-3 text-[12.5px] text-muted-foreground hover:text-foreground"
            onClick={() => void close()}
            disabled={installing}
          >
            Skip for now
          </button>
          <button
            type="button"
            className="flex h-8 items-center gap-2 rounded bg-foreground px-4 text-[12.5px] font-medium text-background disabled:opacity-60"
            onClick={() => void installSelected()}
            disabled={installing || selected.size === 0}
          >
            {installing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Install selected
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecommendedSkillsWelcome;
