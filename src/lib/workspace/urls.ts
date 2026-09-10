export function workspaceItemHref(
  path: string,
  basename: string,
  shell: "web" | "electron",
) {
  const prefix = basename === "/" ? "" : basename.replace(/\/$/, "");
  const href = `${prefix}${path}`;
  return shell === "electron" ? `#${href}` : href;
}
