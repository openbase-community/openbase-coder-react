import { Model, TabNode, type IJsonModel } from "flexlayout-react";

export function layoutTabIds(layout: IJsonModel): Set<string> {
  const ids = new Set<string>();
  const visit = (node: {
    type?: string;
    id?: string;
    children?: unknown[];
  }) => {
    if (node.type === "tab" && node.id) ids.add(node.id);
    node.children?.forEach((child) => visit(child as typeof node));
  };
  visit(layout.layout);
  return ids;
}

export const LAYOUT_VERSION = 1;
export const validPanelPath = (path: unknown): path is string =>
  typeof path === "string" &&
  /^\/(dashboard(?:[/?#]|$)|mobile\/diff)/.test(path);

export function readWorkspaceLayout(
  storage: Pick<Storage, "getItem">,
  key: string,
): Model | null {
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > 500_000) return null;
    const saved = JSON.parse(raw) as { version?: number; layout?: IJsonModel };
    if (saved.version !== LAYOUT_VERSION || !saved.layout) return null;
    if (
      Object.keys(saved.layout.subLayouts ?? {}).length ||
      Object.keys(saved.layout.popouts ?? {}).length
    )
      return null;
    const model = Model.fromJson(saved.layout);
    let count = 0;
    let tabs = 0;
    let valid = true;
    model.visitNodes((node) => {
      if (++count > 300) valid = false;
      if (node instanceof TabNode) {
        tabs++;
        if (
          node.getComponent() !== "route" ||
          !validPanelPath(node.getConfig()?.path)
        )
          valid = false;
      }
    });
    return valid && tabs > 0 && tabs <= 100 ? model : null;
  } catch {
    // An incompatible or damaged saved layout falls back to a fresh workspace.
    return null;
  }
}

export function saveWorkspaceLayout(
  storage: Pick<Storage, "setItem">,
  key: string,
  layout: IJsonModel,
): boolean {
  try {
    storage.setItem(key, JSON.stringify({ version: LAYOUT_VERSION, layout }));
    return true;
  } catch {
    // Storage may be unavailable or full; the live layout remains usable.
    return false;
  }
}
