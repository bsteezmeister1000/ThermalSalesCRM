import { PDFParse } from "pdf-parse";

import { normalizeAddress } from "@/lib/domain/normalization/address";
import { normalizeOrganizationName } from "@/lib/domain/normalization/organization";
import type { SourceAdapter } from "@/lib/domain/adapters/base";
import type {
  DiscoveredRecord,
  NormalizedPermitInput,
  RawDetail,
  SourceAdapterDefinition,
  SourceHealth
} from "@/lib/domain/types";

const CORALVILLE_BASE_URL = "https://www.coralville.org";
const CORALVILLE_ARCHIVE_URL = `${CORALVILLE_BASE_URL}/Archive.aspx?AMID=48`;

const CORALVILLE_BUILDING_TYPES = [
  "Certificate of Occupancy and Zoning Compliance",
  "New Commercial with Residential Units",
  "New Commercial Foundation Only",
  "Single Family Dwellings",
  "Townhome Condominiums",
  "New Commercial Buildout",
  "Commercial Remodel",
  "Residential Remodel",
  "Accessory Building",
  "Industrial Remodel",
  "New Commerical",
  "New Industrial",
  "Multi-Family",
  "Zero Lot Lines",
  "Fence",
  "Duplex",
  "Other"
] as const;

type CoralvilleArchiveEntry = {
  adid: string;
  title: string;
  year: number;
  monthLabel: string;
  detailUrl: string;
  pdfUrl: string;
};

type CoralvillePermitRecord = {
  permitNumber: string;
  issueDate: string;
  ownerName?: string;
  addressLines: string[];
  buildingType: string;
  valuation?: number;
  fee?: number;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForComparison(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

function currentYear(now: Date = new Date()) {
  return now.getFullYear();
}

function monthLabelFromTitle(title: string) {
  const match = title.match(/-\s*([A-Za-z]+)\s+\d{4}$/);
  return match?.[1] ?? title;
}

function parseCurrency(value: string) {
  const normalized = value.replace(/[$,]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : undefined;
}

function isPermitNumber(value: string) {
  return /^\d{2}-\d{4}$/.test(value);
}

function isDateValue(value: string) {
  return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value);
}

function isCurrencyValue(value: string) {
  return /^\$\d[\d,]*(?:\.\d{2})?$/.test(value);
}

function isAddressLine(value: string) {
  return /^\d/.test(value);
}

function isIgnoredDetailLine(value: string) {
  return (
    !value ||
    value === "Permit Valuations & Fees" ||
    value === "Permit" ||
    value === "Number" ||
    value === "Date" ||
    value === "Issued" ||
    value === "Owner Name" ||
    value === "Building Address" ||
    value === "Building Type" ||
    value === "Valuation" ||
    value === "Fee" ||
    value === "Start Date:" ||
    value === "End Date:" ||
    value.startsWith("City of Coralville Building Department") ||
    value.startsWith("Community Development Director:") ||
    /^Page \d+ of \d+$/.test(value)
  );
}

function findBuildingType(value: string) {
  const normalized = normalizeForComparison(value);
  return CORALVILLE_BUILDING_TYPES.map((type) => ({
    type,
    index: normalized.indexOf(normalizeForComparison(type))
  }))
    .filter((match) => match.index >= 0)
    .sort((left, right) => left.index - right.index || right.type.length - left.type.length)[0];
}

function splitOwnerAndAddress(value: string) {
  const addressMatch = value.match(/\b\d{1,6}\s+[A-Za-z0-9]/);
  if (!addressMatch || addressMatch.index === undefined) {
    return {
      ownerName: value || undefined,
      addressLines: [] as string[]
    };
  }

  const ownerName = value.slice(0, addressMatch.index).trim();
  const addressText = value.slice(addressMatch.index).trim();
  const addressLines = addressText
    .split(/\s+(?=\d{1,6}\s+[A-Za-z0-9])/g)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    ownerName: ownerName || undefined,
    addressLines
  };
}

function matchBuildingType(lines: string[]) {
  for (const candidate of CORALVILLE_BUILDING_TYPES) {
    const normalizedCandidate = normalizeForComparison(candidate);
    for (let start = 0; start < lines.length; start += 1) {
      const tail = normalizeForComparison(lines.slice(start).join(" "));
      if (tail === normalizedCandidate) {
        return {
          type: candidate,
          typeStartIndex: start
        };
      }
    }
  }

  const fallbackIndex = Math.max(lines.length - 1, 0);
  return {
    type: lines[fallbackIndex] ?? "Unknown",
    typeStartIndex: fallbackIndex
  };
}

export function parseCoralvilleArchiveHtml(html: string, year: number = currentYear()) {
  const entries = new Map<string, CoralvilleArchiveEntry>();
  const pattern =
    /<a href="Archive\.aspx\?ADID=(\d+)"[^>]*>\s*<span>([^<]+)<\/span>/gi;

  for (const match of html.matchAll(pattern)) {
    const adid = match[1];
    const title = normalizeWhitespace(match[2]);
    if (!title.includes(String(year))) {
      continue;
    }

    entries.set(adid, {
      adid,
      title,
      year,
      monthLabel: monthLabelFromTitle(title),
      detailUrl: `${CORALVILLE_BASE_URL}/Archive.aspx?ADID=${adid}`,
      pdfUrl: `${CORALVILLE_BASE_URL}/ArchiveCenter/ViewFile/Item/${adid}`
    });
  }

  return [...entries.values()];
}

export function parseCoralvillePermitText(text: string) {
  const normalizedText = normalizeWhitespace(
    text
      .replace(/\t/g, " ")
      .replace(/Certificate of Occupancy and\s+Zoning Compliance/g, "Certificate of Occupancy and Zoning Compliance")
      .replace(/New Commercial Foundation\s+Only/g, "New Commercial Foundation Only")
      .replace(/New Commercial with\s+Residential Units/g, "New Commercial with Residential Units")
  );
  const rowStartPattern = /\b\d{2}-\d{4}\s+\d{1,2}\/\d{1,2}\/\d{4}\b/g;
  const rowStarts = [...normalizedText.matchAll(rowStartPattern)];

  if (rowStarts.length) {
    const permits: CoralvillePermitRecord[] = [];

    for (let index = 0; index < rowStarts.length; index += 1) {
      const current = rowStarts[index];
      const next = rowStarts[index + 1];
      if (current.index === undefined) {
        continue;
      }

      const header = current[0];
      const [permitNumber, issueDate] = header.split(/\s+/);
      const segmentStart = current.index + header.length;
      const segmentEnd = next?.index ?? normalizedText.length;
      const segment = normalizedText.slice(segmentStart, segmentEnd).trim();
      const amounts = [...segment.matchAll(/\$[\d,]+(?:\.\d{2})?/g)];

      if (!amounts.length) {
        continue;
      }

      const firstAmount = amounts[0];
      if (firstAmount.index === undefined) {
        continue;
      }

      const body = segment.slice(0, firstAmount.index).trim();
      const typeMatch = findBuildingType(body);
      if (!typeMatch) {
        continue;
      }

      const ownerAndAddress = body.slice(0, typeMatch.index).trim();
      const { ownerName, addressLines } = splitOwnerAndAddress(ownerAndAddress);
      const valuation = amounts.length >= 2 ? parseCurrency(firstAmount[0]) : undefined;
      const fee = parseCurrency(amounts.length >= 2 ? amounts[1][0] : firstAmount[0]);

      permits.push({
        permitNumber,
        issueDate,
        ownerName,
        addressLines,
        buildingType: typeMatch.type,
        valuation,
        fee
      });
    }

    return permits;
  }

  const rawLines = text
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  const detailLines = rawLines.filter((line) => !isIgnoredDetailLine(line));
  const firstPermitIndex = detailLines.findIndex(isPermitNumber);
  if (firstPermitIndex === -1) {
    return [] as CoralvillePermitRecord[];
  }

  const lines = detailLines.slice(firstPermitIndex);
  const permits: CoralvillePermitRecord[] = [];

  for (let index = 0; index < lines.length; ) {
    if (!isPermitNumber(lines[index])) {
      index += 1;
      continue;
    }

    const permitNumber = lines[index];
    const issueDate = lines[index + 1];
    if (!isDateValue(issueDate)) {
      throw new Error(`Unable to parse issue date for Coralville permit ${permitNumber}.`);
    }

    index += 2;

    const recordLines: string[] = [];
    let amountCount = 0;

    while (index < lines.length) {
      const currentLine = lines[index];
      if (isPermitNumber(currentLine) && amountCount >= 2) {
        break;
      }

      if (currentLine === "Report Totals") {
        index = lines.length;
        break;
      }

      recordLines.push(currentLine);
      if (isCurrencyValue(currentLine)) {
        amountCount += 1;
        if (amountCount === 2) {
          index += 1;
          break;
        }
      }

      index += 1;
    }

    if (recordLines.length < 3) {
      continue;
    }

    const valuation = parseCurrency(recordLines.at(-2) ?? "");
    const fee = parseCurrency(recordLines.at(-1) ?? "");
    const bodyLines = recordLines.slice(0, -2);
    const { type, typeStartIndex } = matchBuildingType(bodyLines);
    const ownerAndAddressLines = bodyLines.slice(0, typeStartIndex);
    const addressStartIndex = ownerAndAddressLines.findIndex(isAddressLine);

    const ownerLines =
      addressStartIndex === -1 ? ownerAndAddressLines : ownerAndAddressLines.slice(0, addressStartIndex);
    const addressLines =
      addressStartIndex === -1 ? [] : ownerAndAddressLines.slice(addressStartIndex);

    permits.push({
      permitNumber,
      issueDate,
      ownerName: ownerLines.length ? ownerLines.join(" ") : undefined,
      addressLines,
      buildingType: type,
      valuation,
      fee
    });
  }

  return permits;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "ThermalSalesCRM/1.0 Coralville permit collector"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return response.text();
}

async function fetchPdfText(url: string) {
  const parser = new PDFParse({ url });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

export class CoralvilleBuildingReportsAdapter implements SourceAdapter {
  definition: SourceAdapterDefinition = {
    key: "coralville-building-permit-reports",
    name: "Coralville Building Permit Reports",
    jurisdiction: "Coralville, IA",
    type: "pdf_report",
    description:
      "Automated parser for current-year Coralville building permit report PDFs from the city archive.",
    automationMode: "automated" as const,
    crawlFrequencyMinutes: 60 * 24 * 30
  };

  async fetchIndex(): Promise<DiscoveredRecord[]> {
    const archiveHtml = await fetchText(CORALVILLE_ARCHIVE_URL);
    const entries = parseCoralvilleArchiveHtml(archiveHtml);

    return entries.map((entry) => ({
      sourceRecordKey: entry.adid,
      indexUrl: entry.detailUrl,
      title: entry.title,
      metadata: {
        adid: entry.adid,
        title: entry.title,
        year: entry.year,
        monthLabel: entry.monthLabel,
        detailUrl: entry.detailUrl,
        pdfUrl: entry.pdfUrl
      }
    }));
  }

  async fetchDetail(record: DiscoveredRecord): Promise<RawDetail> {
    const pdfUrl = String(record.metadata?.pdfUrl ?? "");
    if (!pdfUrl) {
      throw new Error(`Missing Coralville PDF URL for record ${record.sourceRecordKey}.`);
    }

    const pdfText = await fetchPdfText(pdfUrl);
    const payload = {
      ...record.metadata,
      pdfText
    } as Record<string, unknown>;

    return {
      sourceUrl: pdfUrl,
      payload,
      rawText: pdfText
    };
  }

  async parse(detail: RawDetail): Promise<NormalizedPermitInput[]> {
    const payload = detail.payload;
    const pdfText = String(payload.pdfText ?? detail.rawText ?? "");
    const reportYear = Number(payload.year ?? currentYear());
    const reportMonth = String(payload.monthLabel ?? "Unknown");
    const permitUrl = String(payload.pdfUrl ?? detail.sourceUrl ?? CORALVILLE_ARCHIVE_URL);

    return parseCoralvillePermitText(pdfText)
      .filter((record) => new Date(record.issueDate).getFullYear() === reportYear)
      .map((record) => {
        const primaryAddress = record.addressLines[0] ?? "";
        const extraAddressLines = record.addressLines.slice(1);
        const normalizedAddress = primaryAddress
          ? normalizeAddress({
              address1: primaryAddress,
              city: "Coralville",
              state: "IA"
            })
          : undefined;

        const reviewFlags: NonNullable<NormalizedPermitInput["reviewFlags"]> = [];

        if (!record.ownerName) {
          reviewFlags.push({
            flag: "missing_builder",
            detail: "No owner name was present in the Coralville PDF row."
          });
        }

        if (extraAddressLines.length) {
          reviewFlags.push({
            flag: "parse_uncertainty",
            detail: "Permit row contains multiple address lines and should be spot-checked."
          });
        }

        if (
          record.buildingType === "Single Family Dwellings" ||
          record.buildingType === "Townhome Condominiums" ||
          record.buildingType === "Residential Remodel"
        ) {
          reviewFlags.push({
            flag: "likely_good_lead",
            detail: `Coralville ${record.buildingType} permit from ${reportMonth} ${reportYear}.`
          });
        }

        return {
          normalizedKey: `${this.definition.key}:${record.permitNumber}`.toLowerCase(),
          permitNumber: record.permitNumber,
          permitType: record.buildingType,
          workClass: record.buildingType,
          issueDate: new Date(record.issueDate),
          status: "issued",
          address1: primaryAddress || undefined,
          address2: extraAddressLines.length ? extraAddressLines.join(" | ") : undefined,
          city: "Coralville",
          state: "IA",
          projectDescription: extraAddressLines.length
            ? `Additional addresses: ${extraAddressLines.join(" | ")}`
            : undefined,
          valuation: record.valuation,
          permitUrl,
          sourceConfidence: extraAddressLines.length ? 68 : 76,
          provenance: {
            adapter: this.definition.key,
            lineage: "coralville_pdf_report",
            sourceMonth: reportMonth,
            sourceYear: reportYear,
            ownerName: record.ownerName,
            fee: record.fee,
            rawAddressLines: record.addressLines
          },
          property:
            primaryAddress && normalizedAddress
              ? {
                  normalizedAddressKey: normalizedAddress.normalizedKey,
                  address1: primaryAddress,
                  city: "Coralville",
                  state: "IA"
                }
              : undefined,
          organizations: record.ownerName
            ? [
                {
                  name: record.ownerName,
                  normalizedName: normalizeOrganizationName(record.ownerName),
                  type: "owner",
                  relationshipType: "owner",
                  confidence: 64
                }
              ]
            : [],
          reviewFlags
        };
      });
  }

  async healthcheck(): Promise<SourceHealth> {
    try {
      const archiveHtml = await fetchText(CORALVILLE_ARCHIVE_URL);
      const entries = parseCoralvilleArchiveHtml(archiveHtml);

      return {
        status: entries.length ? "healthy" : "degraded",
        message: entries.length
          ? `Found ${entries.length} current-year Coralville PDF reports.`
          : "Archive loaded but no current-year Coralville reports were found.",
        supportsAutomation: true
      };
    } catch (error) {
      return {
        status: "failed",
        message:
          error instanceof Error
            ? error.message
            : "Unable to reach the Coralville archive.",
        supportsAutomation: true
      };
    }
  }
}
