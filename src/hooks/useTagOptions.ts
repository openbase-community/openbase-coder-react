import { fetchTagOptions, type TagOption } from "@/lib/item-tags";
import { useCallback, useEffect, useState } from "react";

export const useTagOptions = () => {
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [tagOptionsLoading, setTagOptionsLoading] = useState(false);

  const refreshTagOptions = useCallback(async () => {
    setTagOptionsLoading(true);
    try {
      setTagOptions(await fetchTagOptions());
    } catch {
      // Deliberately silent: tag options only power autocomplete suggestions,
      // and tag save/update failures are surfaced by the callers themselves.
    } finally {
      setTagOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTagOptions();
  }, [refreshTagOptions]);

  return { tagOptions, tagOptionsLoading, refreshTagOptions, setTagOptions };
};
