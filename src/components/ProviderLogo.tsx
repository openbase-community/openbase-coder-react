import claudeLogo from "@/assets/providers/claude.svg?raw";
import openaiLogo from "@/assets/providers/openai.svg?raw";
import type { ModelProvider } from "@/lib/model-provider";
import { cn } from "@/lib/utils";

// Brand colours: Claude's terracotta, OpenAI's black (white in dark mode).
// Applied last so a caller's text colour never washes the mark out.
const LOGOS: Record<ModelProvider, { svg: string; label: string; color: string }> = {
  claude: { svg: claudeLogo, label: "Claude", color: "text-[#D97757]" },
  openai: { svg: openaiLogo, label: "OpenAI", color: "text-foreground" },
};

/**
 * Inline vendor mark (Claude or OpenAI) in its brand colour. Size it with
 * h-/w- classes; the SVG fills the box.
 */
export function ProviderLogo({
  provider,
  className,
}: {
  provider: ModelProvider;
  className?: string;
}) {
  const logo = LOGOS[provider];
  return (
    <span
      // Decorative: it always accompanies a text label, so it must not join
      // the accessible name of the control it sits in.
      aria-hidden="true"
      title={logo.label}
      className={cn(
        "inline-flex shrink-0 [&>svg]:h-full [&>svg]:w-full",
        className,
        logo.color,
      )}
      dangerouslySetInnerHTML={{ __html: logo.svg }}
    />
  );
}
