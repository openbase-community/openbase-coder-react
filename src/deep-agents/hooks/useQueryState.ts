import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Thin wrapper around react-router-dom's useSearchParams that mimics the
 * nuqs useQueryState(key) API: returns [value, setValue] where value is
 * string | null, and setValue accepts string | null.
 */
export function useQueryState(
  key: string
): [string | null, (value: string | null) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key);

  const setValue = useCallback(
    (newValue: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (newValue === null) {
            next.delete(key);
          } else {
            next.set(key, newValue);
          }
          return next;
        },
        { replace: true }
      );
    },
    [key, setSearchParams]
  );

  return [value, setValue];
}
