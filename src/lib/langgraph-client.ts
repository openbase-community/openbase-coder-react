import { Client } from "@langchain/langgraph-sdk";
import { getValidAccessToken } from "@/lib/jwt-auth";

export function createLangGraphClient(deploymentUrl: string) {
  return new Client({
    apiUrl: deploymentUrl,
    onRequest: async (_url, init) => {
      const headers = new Headers(init.headers);
      const token = await getValidAccessToken();

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      return {
        ...init,
        headers,
      };
    },
  });
}
