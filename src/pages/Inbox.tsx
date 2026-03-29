/**
 * Agent Inbox page.
 *
 * Uses the agent-inbox package directly (https://github.com/langchain-ai/agent-inbox)
 * with Next.js shims for routing compatibility in our Vite + React Router app.
 *
 * The ThreadsProvider manages all thread fetching, interrupt handling, and
 * resume logic via the LangGraph SDK. The AgentInbox component provides the
 * full list/detail UI with status filtering, pagination, and tool approval.
 */

import DashboardLayout from "@/components/layouts/ExampleLayout";
import { ThreadsProvider } from "@agent-inbox/components/agent-inbox/contexts/ThreadContext";
import { AgentInbox } from "@agent-inbox/components/agent-inbox/index";
import { Toaster } from "@agent-inbox/components/ui/toaster";

const InboxPage = () => {
  return (
    <DashboardLayout>
      <ThreadsProvider>
        <AgentInbox />
        <Toaster />
      </ThreadsProvider>
    </DashboardLayout>
  );
};

export default InboxPage;
