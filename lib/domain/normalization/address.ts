const STREET_SUFFIXES: Record<string, string> = {
  street: "st",
  avenue: "ave",
  road: "rd",
  drive: "dr",
  boulevard: "blvd",
  lane: "ln",
  court: "ct",
  circle: "cir",
  place: "pl",
  terrace: "ter",
  parkway: "pkwy"
};

const DIRECTIONS: Record<string, string> = {
  north: "n",
  south: "s",
  east: "e",
  west: "w",
  northeast: "ne",
  northwest: "nw",
  southeast: "se",
  southwest: "sw"
};

export function normalizeAddress(input: {
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}) {
  const original = {
    address1: input.address1?.trim() ?? "",
    city: input.city?.trim() ?? "",
    state: input.state?.trim() ?? "",
    zip: input.zip?.trim() ?? ""
  };

  const normalizedStreet = original.address1
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => STREET_SUFFIXES[token] ?? DIRECTIONS[token] ?? token)
    .join(" ");

  const normalized = {
    address1: normalizedStreet,
    city: original.city.toLowerCase(),
    state: original.state.toUpperCase(),
    zip: original.zip.slice(0, 5)
  };

  const normalizedKey = [
    normalized.address1,
    normalized.city,
    normalized.state,
    normalized.zip
  ]
    .filter(Boolean)
    .join("|");

  return {
    original,
    normalized,
    normalizedKey
  };
}
