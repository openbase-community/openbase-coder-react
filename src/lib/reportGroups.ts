import type { ReportsFile } from "@/types/session";

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

export const reportFolderName = (path: string) => path.split("/")[0] || path;

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
