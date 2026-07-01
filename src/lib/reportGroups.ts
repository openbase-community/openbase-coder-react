import type { ReportsFile } from "@/types/session";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ReportGroup<T> = {
  type: "group";
  key: string;
  name: string;
  path: string;
  size: number;
  updated_at: number;
  items: T[];
};

export type ReportFileNode<T> = {
  type: "file";
  key: string;
  updated_at: number;
  item: T;
};

export type ReportNode<T> = ReportGroup<T> | ReportFileNode<T>;

export type ReportDateSection<T> = {
  key: string;
  label: string;
  nodes: ReportNode<T>[];
};

export const reportFolderName = (path: string) => path.split("/")[0] || path;

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const localDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const relativeReportDayLabel = (value: number, now = new Date()) => {
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  const dayDiff = Math.round(
    (startOfLocalDay(date).getTime() - startOfLocalDay(now).getTime()) /
      MS_PER_DAY,
  );
  if (dayDiff === 0) return "Today";
  if (dayDiff === -1) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
};

export const groupReportItems = <T>(
  items: T[],
  getFile: (item: T) => ReportsFile,
  getScope: (item: T) => string = () => "",
): ReportNode<T>[] => {
  const nodes: ReportNode<T>[] = [];
  const groups = new Map<string, ReportGroup<T>>();

  items.forEach((item) => {
    const file = getFile(item);
    const folder = reportFolderName(file.path);
    const scope = getScope(item);
    const groupKey = `${scope}:${folder}`;
    if (!file.path.includes("/") || !folder) {
      nodes.push({
        type: "file",
        key: scope ? `${scope}:${file.path}` : file.path,
        updated_at: file.updated_at,
        item,
      });
      return;
    }

    const existing = groups.get(groupKey);
    if (existing) {
      existing.items.push(item);
      existing.size += file.size;
      existing.updated_at = Math.max(existing.updated_at, file.updated_at);
      return;
    }

    const group: ReportGroup<T> = {
      type: "group",
      key: groupKey,
      name: folder,
      path: folder,
      size: file.size,
      updated_at: file.updated_at,
      items: [item],
    };
    groups.set(groupKey, group);
    nodes.push(group);
  });

  groups.forEach((group) => {
    group.items.sort((a, b) => {
      const fileA = getFile(a);
      const fileB = getFile(b);
      return fileB.updated_at - fileA.updated_at || fileA.path.localeCompare(fileB.path);
    });
  });

  return nodes.sort((a, b) => b.updated_at - a.updated_at || a.key.localeCompare(b.key));
};

export const groupReportItemsByDay = <T>(
  items: T[],
  getFile: (item: T) => ReportsFile,
  getScope: (item: T) => string = () => "",
  now = new Date(),
): ReportDateSection<T>[] => {
  const sections: ReportDateSection<T>[] = [];
  const byKey = new Map<string, { label: string; items: T[] }>();

  items
    .slice()
    .sort((a, b) => getFile(b).updated_at - getFile(a).updated_at)
    .forEach((item) => {
      const file = getFile(item);
      const date = new Date(file.updated_at * 1000);
      const key = Number.isNaN(date.getTime()) ? "unknown" : localDayKey(date);
      let bucket = byKey.get(key);
      if (!bucket) {
        bucket = {
          label: relativeReportDayLabel(file.updated_at, now),
          items: [],
        };
        byKey.set(key, bucket);
      }
      bucket.items.push(item);
    });

  byKey.forEach((bucket, key) => {
    sections.push({
      key,
      label: bucket.label,
      nodes: groupReportItems(bucket.items, getFile, getScope),
    });
  });

  return sections;
};
