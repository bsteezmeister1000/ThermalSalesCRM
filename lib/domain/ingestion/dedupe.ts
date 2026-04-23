export function dedupeRecords<T extends { key: string; canonicalHash: string }>(records: T[]) {
  const seen = new Set<string>();
  return records.filter((record) => {
    const compoundKey = `${record.key}:${record.canonicalHash}`;
    if (seen.has(compoundKey)) {
      return false;
    }
    seen.add(compoundKey);
    return true;
  });
}
