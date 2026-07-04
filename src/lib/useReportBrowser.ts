import { nextReportIndexAfterDelete } from "@/lib/reportDetailNavigation";
import {
  useReportFileActions,
  type ReportFileTarget,
} from "@/lib/useReportFileActions";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

type NavigateOptions = { replace?: boolean };

type UseReportBrowserOptions<T> = {
  /** Items in display order; navigation (previous/next) follows this list. */
  items: T[];
  getKey: (item: T) => string;
  getTarget: (item: T) => ReportFileTarget;
  /** Pathname used when syncing the active item to the URL. Defaults to the current pathname. */
  pathname?: string;
  /** Writes the params that identify `item` onto `params`. */
  applyItemParams: (params: URLSearchParams, item: T) => void;
  /** Removes the active-item params from `params`. */
  clearItemParams: (params: URLSearchParams) => void;
  /** Whether `params` request an active item at all. */
  isItemRequested: (params: URLSearchParams) => boolean;
  /** Resolves the item requested by `params`, or null when it is not available. */
  findRequestedItem: (params: URLSearchParams) => T | null;
  loadErrorMessage?: string;
  /** Invoked after a report is deleted so callers can prune their item state. */
  onItemDeleted?: (target: ReportFileTarget) => void;
};

/**
 * Shared report-browser state: active-report URL sync, open/close/next/prev
 * navigation, per-report scroll restoration, and group expansion, layered on
 * top of `useReportFileActions`.
 */
export const useReportBrowser = <T,>({
  items,
  getKey,
  getTarget,
  pathname,
  applyItemParams,
  clearItemParams,
  isItemRequested,
  findRequestedItem,
  loadErrorMessage,
  onItemDeleted,
}: UseReportBrowserOptions<T>) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [scrollTops, setScrollTops] = useState<Record<string, number>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const activeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    activeKeyRef.current = activeKey;
  }, [activeKey]);

  const actions = useReportFileActions({
    loadErrorMessage,
    onDeleted: (target) => {
      onItemDeleted?.(target);
      if (activeKeyRef.current === target.key) {
        setActiveKey(null);
      }
    },
  });
  const { loadReportFile, deleteReport, downloadReport, startReportAction } =
    actions;

  const targetPathname = pathname ?? location.pathname;

  const loadItem = useCallback(
    async (item: T) => {
      const target = getTarget(item);
      setActiveKey(target.key);
      await loadReportFile(target);
    },
    [getTarget, loadReportFile],
  );

  const navigateToItem = useCallback(
    (item: T, options: NavigateOptions = {}) => {
      const params = new URLSearchParams(searchParams);
      applyItemParams(params, item);
      navigate(
        {
          pathname: targetPathname,
          search: params.toString(),
        },
        options,
      );
    },
    [applyItemParams, navigate, searchParams, targetPathname],
  );

  const navigateToList = useCallback(
    (options: NavigateOptions = {}) => {
      const params = new URLSearchParams(searchParams);
      clearItemParams(params);
      navigate(
        {
          pathname: targetPathname,
          search: params.toString(),
        },
        options,
      );
    },
    [clearItemParams, navigate, searchParams, targetPathname],
  );

  const openItem = useCallback(
    (item: T) => {
      navigateToItem(item);
      void loadItem(item);
    },
    [loadItem, navigateToItem],
  );

  const closeItem = useCallback(
    () => navigateToList({ replace: true }),
    [navigateToList],
  );

  const activeIndex = useMemo(
    () => items.findIndex((item) => getKey(item) === activeKey),
    [activeKey, getKey, items],
  );
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex >= 0 && activeIndex < items.length - 1;

  const openAdjacentItem = useCallback(
    (direction: number) => {
      if (activeIndex < 0) return;
      const nextItem = items[activeIndex + direction];
      if (nextItem) {
        navigateToItem(nextItem);
        void loadItem(nextItem);
      }
    },
    [activeIndex, items, loadItem, navigateToItem],
  );

  const deleteItem = useCallback(
    (item: T) => deleteReport(getTarget(item)),
    [deleteReport, getTarget],
  );

  const downloadItem = useCallback(
    (item: T) => downloadReport(getTarget(item)),
    [downloadReport, getTarget],
  );

  const deleteActiveItem = useCallback(
    async (item: T) => {
      const key = getKey(item);
      const index = items.findIndex((candidate) => getKey(candidate) === key);
      const nextIndex = nextReportIndexAfterDelete(index, items.length);
      const nextItem = nextIndex >= 0 ? items[nextIndex] : null;
      const deleted = await deleteItem(item);
      if (!deleted) return;

      if (nextItem) {
        navigateToItem(nextItem, { replace: true });
        await loadItem(nextItem);
      } else {
        navigateToList({ replace: true });
      }
    },
    [deleteItem, getKey, items, loadItem, navigateToItem, navigateToList],
  );

  const startItemAction = useCallback(
    async (item: T) => {
      const result = await startReportAction(getTarget(item));
      if (result?.thread_id) {
        setActiveKey(null);
        navigate(`/dashboard/threads/${result.thread_id}`);
      }
    },
    [getTarget, navigate, startReportAction],
  );

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const getScrollTop = useCallback(
    (key: string) => scrollTops[key] ?? 0,
    [scrollTops],
  );

  const setScrollTop = useCallback((key: string, scrollTop: number) => {
    setScrollTops((current) => ({
      ...current,
      [key]: scrollTop,
    }));
  }, []);

  useEffect(() => {
    if (!isItemRequested(searchParams)) {
      setActiveKey(null);
      return;
    }

    const item = findRequestedItem(searchParams);
    if (item) {
      void loadItem(item);
    }
  }, [findRequestedItem, isItemRequested, loadItem, searchParams]);

  return {
    ...actions,
    activeKey,
    activeKeyRef,
    setActiveKey,
    activeIndex,
    activeItem,
    hasPrevious,
    hasNext,
    expandedGroups,
    toggleGroup,
    getScrollTop,
    setScrollTop,
    loadItem,
    navigateToItem,
    navigateToList,
    openItem,
    closeItem,
    openAdjacentItem,
    deleteItem,
    downloadItem,
    deleteActiveItem,
    startItemAction,
  };
};
