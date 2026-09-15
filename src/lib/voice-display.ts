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
