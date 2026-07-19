/** Terminal command for reopening a thread's native transcript in Claude Code. */

const shellQuote = (value: string) =>
  /^[A-Za-z0-9_\-./~]+$/.test(value)
    ? value
    : `'${value.replace(/'/g, `'\\''`)}'`;

export const cliResumeCommand = (directory: string, backendSessionId: string) =>
  `cd ${shellQuote(directory)} && claude --resume ${shellQuote(backendSessionId)}`;
