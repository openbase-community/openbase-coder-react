import { apiFetch } from "./api";
import { extractErrorMessage } from "./api-errors";
import { fleetApiPath } from "./fleet";

export const MAX_THREAD_NAME_LENGTH = 200;

/** Normalize a user-typed thread name; empty when nothing usable remains. */
export const normalizeThreadName = (name: string) =>
  name.replace(/\s+/g, " ").trim().slice(0, MAX_THREAD_NAME_LENGTH);

/** Rename a thread on its coding backend (Codex app-server or Claude store). */
export const renameThread = async (
  threadId: string,
  name: string,
  originHost?: string | null,
): Promise<void> => {
  const response = await apiFetch(
    fleetApiPath(originHost, `/api/threads/${threadId}/name/`),
    {
      method: "PATCH",
      body: JSON.stringify({ name }),
    },
  );
  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, "Failed to rename thread"),
    );
  }
};
