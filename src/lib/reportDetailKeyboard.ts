export type ReportDetailKeyboardAction =
  | "close"
  | "previous"
  | "next"
  | "delete";

export const reportDetailKeyboardAction = ({
  key,
  hasPrevious,
  hasNext,
  editingTarget,
  blockedByDialog,
  defaultPrevented,
}: {
  key: string;
  hasPrevious: boolean;
  hasNext: boolean;
  editingTarget?: boolean;
  blockedByDialog?: boolean;
  defaultPrevented?: boolean;
}): ReportDetailKeyboardAction | null => {
  if (defaultPrevented || editingTarget || blockedByDialog) return null;
  if (key === "Escape") return "close";
  if (key === "Backspace" || key === "Delete") return "delete";
  if (key === "ArrowLeft" && hasPrevious) return "previous";
  if (key === "ArrowRight" && hasNext) return "next";
  return null;
};
