const VOICE_TAG_OPEN = "<voice>";
const VOICE_TAG_CLOSE = "</voice>";

/**
 * Return the original transcript from the voice transport envelope.
 *
 * Only a leading wrapper is removed. Ordinary prose and code examples that
 * mention the tags remain unchanged. The transport escapes ampersands and
 * angle brackets before wrapping, so the FIRST close tag after a leading
 * open tag is always the authentic envelope end — the transcript itself can
 * never contain a literal tag. Decode exactly those entities afterwards.
 *
 * The envelope is not always the whole message: Claude Code user turns join
 * content blocks with newlines, so harness-appended context (system
 * reminders, hook output) can trail the envelope. Requiring the text to END
 * with the close tag rendered the tags raw for every such turn; unwrap the
 * leading envelope and keep any trailing content verbatim instead.
 */
export function voicePromptForDisplay(text: string): string {
  if (!text.startsWith(VOICE_TAG_OPEN)) {
    return text;
  }
  const close = text.indexOf(VOICE_TAG_CLOSE);
  if (close === -1) {
    return text;
  }

  const transcript = text.slice(VOICE_TAG_OPEN.length, close);
  if (transcript.includes(VOICE_TAG_OPEN)) {
    return text;
  }

  const rest = text.slice(close + VOICE_TAG_CLOSE.length);
  if (rest.includes(VOICE_TAG_OPEN)) {
    // Concatenated envelopes (two voice turns mashed into one message) are
    // ambiguous — leave them for a human eye rather than half-unwrapping.
    return text;
  }
  const decoded = transcript
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
  return rest.trim() ? decoded + rest : decoded;
}

const SYSTEM_NOTE_OPEN = "[Openbase system note:";

/** End index (exclusive) of a bracketed note starting at 0, or -1. */
function systemNoteEnd(text: string): number {
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "[") depth += 1;
    if (text[index] === "]") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return -1;
}

/**
 * The text a user bubble shows. The API sends ``display`` (the prompt with
 * injected system notes, harness reminders and the voice envelope removed)
 * so every client renders the same answer; prefer it whenever present.
 *
 * Backends older than that field only send the raw prompt. The fallback
 * strips the leading ``[Openbase system note: …]`` blocks the dispatcher
 * prepends (several may stack, and they nest brackets) and then the voice
 * envelope behind them. If the stored prompt is only a note (a truncated
 * preview), show a short placeholder instead of the note.
 */
export function userPromptForDisplay(
  text: string,
  display?: string | null,
): string {
  if (typeof display === "string") return display;
  let rest = text;
  while (rest.trimStart().startsWith(SYSTEM_NOTE_OPEN)) {
    const trimmed = rest.trimStart();
    const end = systemNoteEnd(trimmed);
    if (end === -1) {
      return "(message not recorded — only a truncated system note was stored)";
    }
    rest = trimmed.slice(end).trimStart();
    if (!rest) return "(message not recorded — only a system note was stored)";
  }
  return voicePromptForDisplay(rest);
}
