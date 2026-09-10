import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useThreadConnection } from "@/hooks/use-thread-connection";

type Connection = ReturnType<typeof useThreadConnection>;
const emptyConnection: Connection = {
  thread: null,
  isConnected: false,
  loadError: null,
  startTurn: async () => false,
  queueTurn: async () => false,
  steerTurn: async () => false,
  interruptTurn: () => {},
  refreshThread: async () => {},
};
const Context = createContext<{
  connections: Record<string, Connection>;
  retain: (id: string) => () => void;
} | null>(null);

function ConnectionHost({
  id,
  publish,
}: {
  id: string;
  publish: (id: string, connection: Connection) => void;
}) {
  const connection = useThreadConnection(id);
  useEffect(() => publish(id, connection), [id, connection, publish]);
  return null;
}

/** One transport per thread, regardless of how many panes display it. */
export function ThreadConnectionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const counts = useRef(new Map<string, number>());
  const [ids, setIds] = useState<string[]>([]);
  const [connections, setConnections] = useState<Record<string, Connection>>(
    {},
  );
  const retain = useCallback((id: string) => {
    counts.current.set(id, (counts.current.get(id) ?? 0) + 1);
    setIds([...counts.current.keys()]);
    return () => {
      const count = (counts.current.get(id) ?? 1) - 1;
      if (count > 0) counts.current.set(id, count);
      else {
        counts.current.delete(id);
        setIds([...counts.current.keys()]);
        setConnections((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
      }
    };
  }, []);
  const publish = useCallback((id: string, connection: Connection) => {
    if (counts.current.has(id))
      setConnections((current) => ({ ...current, [id]: connection }));
  }, []);
  return (
    <Context.Provider value={{ connections, retain }}>
      {ids.map((id) => (
        <ConnectionHost key={id} id={id} publish={publish} />
      ))}
      {children}
    </Context.Provider>
  );
}

export function useThreadWebSocket(threadId: string | undefined): Connection {
  const context = useContext(Context);
  if (!context) throw new Error("ThreadConnectionsProvider is required");
  useEffect(
    () => (threadId ? context.retain(threadId) : undefined),
    [context.retain, threadId],
  );
  return threadId
    ? (context.connections[threadId] ?? emptyConnection)
    : emptyConnection;
}
