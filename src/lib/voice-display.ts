const VOICE_TAG_OPEN = "<voice>";
const VOICE_TAG_CLOSE = "</voice>";

/**
 * Return the original transcript from the voice transport envelope.
 *
 * Only a complete outer wrapper is removed. Ordinary prose and code examples
 * that mention the tags remain unchanged. The transport escapes ampersands
 * and angle brackets before wrapping, so decode exactly those entities after
 * the envelope has been authenticated by its shape.
 */
export function voicePromptForDisplay(text: string): string {
  if (!text.startsWith(VOICE_TAG_OPEN) || !text.endsWith(VOICE_TAG_CLOSE)) {
    return text;
  }

  const transcript = text.slice(
    VOICE_TAG_OPEN.length,
    text.length - VOICE_TAG_CLOSE.length,
  );
  if (
    transcript.includes(VOICE_TAG_OPEN) ||
    transcript.includes(VOICE_TAG_CLOSE)
  ) {
    return text;
  }

  return transcript
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
