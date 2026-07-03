export const nextReportIndexAfterDelete = (
  deletedIndex: number,
  itemCount: number,
) => {
  if (deletedIndex < 0 || itemCount <= 1) return -1;
  return deletedIndex < itemCount - 1 ? deletedIndex + 1 : deletedIndex - 1;
};
