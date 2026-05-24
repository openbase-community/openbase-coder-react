import DashboardLayout from "@/components/layouts/ExampleLayout";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { fetchThreadPage, LARGE_THREAD_PAGE_SIZE } from "@/lib/project-display";
import type { ThreadInfo } from "@/types/session";
import { MessageSquare, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import SessionDetail from "./SessionDetail";

const DispatchChat = () => {
  const [dispatchThread, setDispatchThread] = useState<ThreadInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDispatchThread = useCallback(async () => {
    setLoading(true);
    const data = await fetchThreadPage(
      apiFetch,
      `/api/threads/?page_size=${LARGE_THREAD_PAGE_SIZE}`,
    );
    const threads: ThreadInfo[] = data.threads;
    setDispatchThread(
      threads.find(
        (thread) => thread.is_livekit_dispatcher || thread.is_livekit_shared,
      ) ?? null,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchDispatchThread();
  }, [fetchDispatchThread]);

  if (dispatchThread) {
    return <SessionDetail threadIdOverride={dispatchThread.thread_id} />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            Dispatch
          </h1>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Shared voice dispatch chat
          </p>
        </div>

        <div className="rounded border border-dashed border-border bg-surface px-4 py-8 text-center">
          <MessageSquare className="mx-auto h-5 w-5 text-muted-foreground/40" />
          <p className="mt-2 text-[12px] text-muted-foreground">
            {loading ? "Looking for dispatch chat…" : "No dispatch chat found."}
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
