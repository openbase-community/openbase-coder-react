/** CommonMark ordered-list marker: 1–9 digits, `.` or `)`, then whitespace or end of line. */
const LONE_ORDERED_LIST_ITEM = /^(\d{1,9})([.)])(?=\s|$)/;

/**
 * Single-line replies that CommonMark would parse as one ordered-list item
 * ("62.", "1999. was a good year") get their delimiter escaped so they render
 * as the plain paragraph the author meant, without list indentation. Multi-line
 * text, including real lists, is returned unchanged. Kept at parity with the
 * iOS and Android `ChatMarkdown.normalize`.
 */
export function normalizeChatMarkdown(text: string): string {
  const body = text.trim();
  if (body.includes("\n")) return text;
  const match = LONE_ORDERED_LIST_ITEM.exec(body);
  if (!match) return text;
  const delimiterIndex = match[1].length;
  return `${body.slice(0, delimiterIndex)}\\${body.slice(delimiterIndex)}`;
}
