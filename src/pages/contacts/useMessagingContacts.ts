import { notifyMessagingContactsChanged } from "@/hooks/useMessagingContactsSummary";
import {
  assignContactCategory,
  createContactCategory,
  deleteContactCategory,
  fetchMessagingContacts,
  skipContacts,
  updateContactCategory,
  type CategoryPolicy,
  type MessagingContactsSnapshot,
} from "@/lib/messaging-contacts";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

/** Loads the review snapshot and applies category actions against it. */
export function useMessagingContacts() {
  const [snapshot, setSnapshot] = useState<MessagingContactsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      setSnapshot(await fetchMessagingContacts({ refresh }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reach the local API.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = useCallback(
    async (action: () => Promise<unknown>, success: string) => {
      setActing(true);
      try {
        await action();
        toast.success(success);
        notifyMessagingContactsChanged();
        await load();
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Request failed.");
        return false;
      } finally {
        setActing(false);
      }
    },
    [load],
  );

  const assign = useCallback(
    (keys: string[], category: string | null) =>
      run(
        () => assignContactCategory(keys, category),
        category
          ? keys.length === 1
            ? "Contact categorized"
            : `${keys.length} contacts categorized`
          : "Category cleared",
      ),
    [run],
  );

  const skip = useCallback(
    (keys: string[]) =>
      run(
        () => skipContacts(keys),
        keys.length === 1 ? "Skipped for a day" : `${keys.length} contacts skipped for a day`,
      ),
    [run],
  );

  const addCategory = useCallback(
    (label: string, policy: CategoryPolicy) =>
      run(() => createContactCategory(label, policy), "Category added"),
    [run],
  );

  const editCategory = useCallback(
    (id: string, label: string, policy: CategoryPolicy) =>
      run(() => updateContactCategory(id, label, policy), "Category updated"),
    [run],
  );

  const removeCategory = useCallback(
    (id: string) => run(() => deleteContactCategory(id), "Category deleted"),
    [run],
  );

  return {
    snapshot,
    loading,
    acting,
    error,
    load,
    assign,
    skip,
    addCategory,
    editCategory,
    removeCategory,
  };
}
