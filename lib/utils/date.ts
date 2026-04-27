export function toDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatIsoDateTime(value: Date | string | null | undefined) {
  return toDate(value)?.toISOString() ?? "Unknown";
}

export function formatIsoDate(value: Date | string | null | undefined) {
  return toDate(value)?.toISOString().slice(0, 10) ?? "Unknown";
}
