/**
 * Compatibility shim for next/navigation.
 *
 * Maps Next.js routing hooks to react-router-dom equivalents so that
 * agent-inbox components can be used inside a Vite + React Router app.
 */

import {
  useNavigate,
  useLocation,
  useSearchParams as useRRSearchParams,
} from "react-router-dom";

export function useRouter() {
  const navigate = useNavigate();
  return {
    replace(path: string, _options?: { scroll?: boolean }) {
      navigate(path, { replace: true });
    },
    push(path: string) {
      navigate(path);
    },
    refresh() {
      // No server-side refresh in SPA — trigger a re-render by navigating to
      // the same location.
      navigate(0);
    },
    back() {
      navigate(-1);
    },
    forward() {
      navigate(1);
    },
    prefetch() {
      // no-op in SPA
    },
  };
}

export function usePathname(): string {
  const location = useLocation();
  return location.pathname;
}

export function useSearchParams(): URLSearchParams {
  const [searchParams] = useRRSearchParams();
  return searchParams;
}
