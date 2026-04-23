export function detectChangedFields<T extends Record<string, unknown>>(
  previousValue: T,
  nextValue: T
) {
  const changedFields = Object.keys(nextValue).filter(
    (key) => JSON.stringify(previousValue[key]) !== JSON.stringify(nextValue[key])
  );

  return {
    changedFields,
    hasChanges: changedFields.length > 0,
    previousValue,
    nextValue
  };
}
