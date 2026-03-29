import { createContext, useContext, useMemo, ReactNode } from "react";
import { Client } from "@langchain/langgraph-sdk";
import { createLangGraphClient } from "@/lib/langgraph-client";

interface ClientContextValue {
  client: Client;
}

const ClientContext = createContext<ClientContextValue | null>(null);

interface ClientProviderProps {
  children: ReactNode;
  deploymentUrl: string;
}

export function ClientProvider({ children, deploymentUrl }: ClientProviderProps) {
  const client = useMemo(() => {
    return createLangGraphClient(deploymentUrl);
  }, [deploymentUrl]);

  const value = useMemo(() => ({ client }), [client]);

  return (
    <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
  );
}

export function useClient(): Client {
  const context = useContext(ClientContext);

  if (!context) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context.client;
}
