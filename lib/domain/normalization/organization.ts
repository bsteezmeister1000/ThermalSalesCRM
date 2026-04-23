const NOISE_WORDS = [
  "llc",
  "inc",
  "co",
  "corp",
  "corporation",
  "company",
  "l.l.c",
  "ltd"
];

export function normalizeOrganizationName(name: string) {
  const normalizedName = name
    .toLowerCase()
    .replace(/[&]/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !NOISE_WORDS.includes(token))
    .join(" ");

  return normalizedName.trim();
}

export function organizationAliases(name: string) {
  const base = normalizeOrganizationName(name);
  return Array.from(
    new Set([
      base,
      base.replace(/\band\b/g, "&"),
      base.replace(/\s+/g, " ")
    ])
  ).filter(Boolean);
}
