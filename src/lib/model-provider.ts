export type ModelProvider = "claude" | "openai";

/**
 * Human label for a model id, matching how the pickers name models:
 * "opus" → "Opus", "sonnet-5" → "Sonnet 5", "claude-haiku-4-5-20251001" →
 * "Haiku 4.5", "gpt-5.5" → "GPT-5.5".
 */
export function prettyModelLabel(
  model: string | null | undefined,
): string | undefined {
  const trimmed = model?.trim();
  if (!trimmed) return undefined;
  const short = trimmed.replace(/^claude-/i, "").replace(/-\d{8}$/, "");
  const [head, ...rest] = short.split("-");
  if (!head) return short;
  if (/^gpt$/i.test(head)) return `GPT${rest.length ? `-${rest.join("-")}` : ""}`;
  const name = head.charAt(0).toUpperCase() + head.slice(1);
  if (rest.length === 0) return name;
  const version = rest.every((part) => /^\d+$/.test(part))
    ? rest.join(".")
    : rest.join(" ");
  return `${name} ${version}`;
}

/**
 * Which vendor a model id belongs to, for the logo shown beside model
 * labels. `engine` (from the backend-model settings API) wins when present;
 * otherwise the id is matched by family name.
 */
/** Vendor for a thread's backend id (`claude_code`, `codex`, cloud variants). */
export function backendProvider(
  backend: string | null | undefined,
): ModelProvider | undefined {
  const id = backend?.trim().toLowerCase();
  if (!id) return undefined;
  if (id.includes("codex")) return "openai";
  if (id.includes("claude") || id === "openbase_cloud") return "claude";
  return undefined;
}

export function modelProvider(
  model: string | null | undefined,
  engine?: string | null,
): ModelProvider | undefined {
  if (engine === "claude") return "claude";
  if (engine === "codex") return "openai";
  const id = model?.trim().toLowerCase();
  if (!id) return undefined;
  if (/^(claude|opus|sonnet|haiku|fable)/.test(id)) return "claude";
  if (/^(gpt|codex|o\d)/.test(id)) return "openai";
  return undefined;
}
