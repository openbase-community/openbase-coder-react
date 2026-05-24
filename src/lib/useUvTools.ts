import { useCallback, useEffect, useState } from "react";
import { fetchUvTools, type UvTool } from "@/lib/uv-tools";

export const useUvTools = () => {
  const [tools, setTools] = useState<UvTool[]>([]);
  const [uvPath, setUvPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTools = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUvTools();
      setTools(data.tools);
      setUvPath(data.uv_path);
      setError(data.error);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reach the local API.",
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTools();
  }, [fetchTools]);

  return {
    tools,
    uvPath,
    error,
    loading,
    fetchTools,
    setTools,
    setUvPath,
    setError,
  };
};
