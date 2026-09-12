import { apiFetch } from "@/lib/api";
import { fleetApiPath } from "@/lib/fleet";
import type { ThreadInfo } from "@/types/session";

export const setThreadFavorite = async (
  threadId: string,
  isFavorite: boolean,
  originHost?: string | null,
): Promise<Pick<ThreadInfo, "thread_id" | "is_favorite" | "favorited_at">> => {
  const response = await apiFetch(
    fleetApiPath(originHost, `/api/threads/${threadId}/favorite/`),
    {
      method: "PATCH",
      body: JSON.stringify({ is_favorite: isFavorite }),
    },
  );
  if (!response.ok) {
    throw new Error("Failed to update favorite");
  }
  const data = await response.json();
  return {
    thread_id: data.thread_id,
    is_favorite: Boolean(data.is_favorite),
    favorited_at:
      typeof data.favorited_at === "string" ? data.favorited_at : null,
  };
};
