// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  ThreadConnectionsProvider,
  useThreadWebSocket,
} from "./thread-connections";

const lifecycle = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn() }));
const connection = { thread: null, isConnected: true };
vi.mock("@/hooks/use-thread-connection", () => ({
  useThreadConnection: (id: string) => {
    useEffect(() => {
      lifecycle.start(id);
      return () => lifecycle.stop(id);
    }, [id]);
    return connection;
  },
}));
afterEach(cleanup);

function View() {
  const connection = useThreadWebSocket("thread-one");
  return <span>{connection.isConnected ? "Connected" : "Loading"}</span>;
}

it("shares a thread transport until its final view closes", async () => {
  const { rerender, unmount } = render(
    <ThreadConnectionsProvider>
      <View />
      <View />
    </ThreadConnectionsProvider>,
  );
  expect(await screen.findAllByText("Connected")).toHaveLength(2);
  expect(lifecycle.start).toHaveBeenCalledTimes(1);
  rerender(
    <ThreadConnectionsProvider>
      <View />
    </ThreadConnectionsProvider>,
  );
  expect(lifecycle.stop).not.toHaveBeenCalled();
  unmount();
  expect(lifecycle.stop).toHaveBeenCalledTimes(1);
});
