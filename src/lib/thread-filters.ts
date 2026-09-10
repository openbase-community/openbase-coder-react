import type { ThreadInfo } from "@/types/session";

import {
  threadAgentVoiceName,
  threadDisplayName,
  threadModelLabel,
  threadProjectLabel,
} from "./thread-display";

export type ThreadFilters = {
  search: string;
  tags: string[];
};

const normalize = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? "";

const tagKey = (value: string) => normalize(value);

export const filterThreads = (
  threads: ThreadInfo[],
  filters: ThreadFilters,
  displayNames = new Map<string, string>(),
) => {
  const query = normalize(filters.search);
  const selectedTags = filters.tags.map(tagKey).filter(Boolean);

  return threads.filter((thread) => {
    const threadTags = thread.tags ?? [];
    const threadTagKeys = new Set(threadTags.map(tagKey));
    if (selectedTags.some((tag) => !threadTagKeys.has(tag))) {
      return false;
    }

    if (!query) return true;

    return [
      displayNames.get(thread.thread_id) ?? threadDisplayName(thread),
      threadProjectLabel(thread),
      thread.directory,
      thread.status,
      thread.backend,
      threadModelLabel(thread),
      thread.reasoning_effort,
      threadAgentVoiceName(thread),
      ...threadTags,
    ]
      .filter(Boolean)
      .some((value) => normalize(value).includes(query));
  });
};
