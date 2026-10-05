import DashboardLayout from "@/components/layouts/DashboardLayout";
import { DispatcherHelp } from "@/components/thread/DispatcherHelp";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { useVoiceCall } from "@/hooks/use-voice-call";
import { apiFetch } from "@/lib/api";
import { fetchThreadPage, LARGE_THREAD_PAGE_SIZE } from "@/lib/project-display";
import type { ThreadInfo } from "@/types/session";
import { Radio, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import SessionDetail from "./SessionDetail";

const DispatchChat = () => {
  const [dispatchThread, setDispatchThread] = useState<ThreadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Call and dispatch are one surface: the dispatch composer starts a voice
  // call when its message field is empty, so the voice-call lifecycle lives
  // here and is handed to the chat composer.
  const call = useVoiceCall();

  const fetchDispatchThreadFallback = useCallback(async () => {
    const data = await fetchThreadPage(
      apiFetch,
      `/api/threads/?page_size=${LARGE_THREAD_PAGE_SIZE}`,
    );
    return (
      data.threads.find((thread) => thread.voice_route?.role === "dispatcher") ??
      null
    );
  }, []);

  const fetchDispatchThread = useCallback(async () => {
    setLoading(true);
    try {
      let thread: ThreadInfo | null = null;
      const response = await apiFetch("/api/threads/dispatcher/");
      if (response.ok) {
        thread = (await response.json()) as ThreadInfo;
      } else {
        // Older CLIs do not expose the Dispatcher endpoint; fall back to
        // scanning the thread list before reporting a failure.
        thread = await fetchDispatchThreadFallback();
      }
      setDispatchThread(thread);
      setError(null);
    } catch (err) {
      setDispatchThread(null);
      setError(
        err instanceof Error ? err.message : "Unable to reach the local API.",
      );
    } finally {
      setLoading(false);
    }
  }, [fetchDispatchThreadFallback]);

  useEffect(() => {
    void fetchDispatchThread();
  }, [fetchDispatchThread]);

  if (dispatchThread) {
    return (
      <SessionDetail
        threadIdOverride={dispatchThread.thread_id}
        allowDispatcherThread
        call={call}
      />
    );
  }

  return (
    <DashboardLayout>
      <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-4">
        <div>
          <div className="flex items-center gap-1">
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Dispatcher
            </h1>
            <DispatcherHelp />
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Shared voice Dispatcher chat
          </p>
        </div>

        {error ? (
          <ErrorBanner>
            {error}
          </ErrorBanner>
        ) : null}

        {/* Empty state: a large, very faint Dispatcher glyph centered in the
            remaining space, with the status and refresh action beneath it. */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Radio
            aria-hidden="true"
            strokeWidth={1.25}
            className="h-40 w-40 text-foreground opacity-[0.06] dark:opacity-[0.08]"
          />
          <p className="mt-4 text-[12px] text-muted-foreground">
            {loading ? "Looking for Dispatcher chat…" : "No Dispatcher chat found."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 h-7 px-2.5 text-[12px]"
            onClick={() => void fetchDispatchThread()}
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DispatchChat;
