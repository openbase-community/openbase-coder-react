export const isEditingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const editable = target.closest(
    "input, textarea, select, [contenteditable='true'], [role='textbox']",
  );
  return editable instanceof HTMLElement;
};

export const isInsideAlertDialog = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("[role='alertdialog']"));
};
