/**
 * Marks `<html data-window-inactive="true">` while the window is hidden or
 * unfocused. `index.css` pauses every CSS animation under that attribute, so
 * an idle background window stops repainting (spinners, pulsing dots).
 */

type ListenerTarget = {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};

type ActivityDocument = ListenerTarget &
  Pick<Document, "hasFocus" | "visibilityState"> & {
    documentElement: { dataset: DOMStringMap };
  };

export function isWindowInactive(doc: Pick<Document, "hasFocus" | "visibilityState">): boolean {
  return doc.visibilityState === "hidden" || !doc.hasFocus();
}

export function installWindowActivityAttribute(
  doc: ActivityDocument = document,
  win: ListenerTarget = window,
): () => void {
  const update = () => {
    if (isWindowInactive(doc)) {
      doc.documentElement.dataset.windowInactive = "true";
    } else {
      delete doc.documentElement.dataset.windowInactive;
    }
  };
  update();
  doc.addEventListener("visibilitychange", update);
  win.addEventListener("focus", update);
  win.addEventListener("blur", update);
  return () => {
    doc.removeEventListener("visibilitychange", update);
    win.removeEventListener("focus", update);
    win.removeEventListener("blur", update);
    delete doc.documentElement.dataset.windowInactive;
  };
}
