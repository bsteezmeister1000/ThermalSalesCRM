import { normalizeOrganizationName } from "@/lib/domain/normalization/organization";
import type { SourceAdapter } from "@/lib/domain/adapters/base";
import type {
  CompletenessStats,
  ConnectorSyncResult,
  NormalizedOrganizationInput,
  RawSourceRecord,
  SourceAdapterDefinition,
  ValidationIssue
} from "@/lib/domain/types";

type DirectoryEntry = {
  sourceRecordKey: string;
  rawCompanyName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  serviceArea?: string;
  notes?: string;
  sourceUrl?: string;
};

type HtmlDirectoryAdapterOptions = {
  definition: SourceAdapterDefinition;
  parseDirectory: (html: string) => DirectoryEntry[];
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#038;/g, "&")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(value?: string) {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10) return undefined;
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

function normalizeEmail(value?: string) {
  return value?.trim().toLowerCase() || undefined;
}

function normalizeWebsite(value?: string) {
  if (!value) return undefined;
  return value.trim();
}

function buildCompletenessStats(rawRecords: RawSourceRecord[], organizations: NormalizedOrganizationInput[]): CompletenessStats {
  const total = organizations.length || 1;
  return {
    totalRawRecords: rawRecords.length,
    totalNormalizedRecords: organizations.length,
    percentWithAddress: Math.round((organizations.filter((record) => record.street && record.city).length / total) * 100),
    percentWithPermitNumber: 0,
    percentWithIssueDate: 0,
    percentWithContractorBuilder: Math.round((organizations.filter((record) => record.rawCompanyName).length / total) * 100),
    percentWithOwner: 0,
    percentWithProjectValue: 0,
    percentWithDescription: Math.round((organizations.filter((record) => record.serviceArea || record.notes).length / total) * 100),
    parseErrorRate: 0,
    duplicateRate: 0
  };
}

export class HtmlDirectoryAdapter implements SourceAdapter {
  definition;
  private parseDirectory: HtmlDirectoryAdapterOptions["parseDirectory"];

  constructor(options: HtmlDirectoryAdapterOptions) {
    this.definition = options.definition;
    this.parseDirectory = options.parseDirectory;
  }

  async fetchSourceData(): Promise<RawSourceRecord[]> {
    const response = await fetch(this.definition.baseUrl, {
      signal: AbortSignal.timeout(20_000),
      headers: {
        "user-agent": "BuildSignal/1.0 (+public data sync; contact admin for questions)"
      },
      redirect: "follow"
    });

    const html = await response.text();

    return [
      {
        sourceRecordKey: this.definition.key,
        sourceUrl: this.definition.baseUrl,
        payload: {
          html
        },
        rawText: html,
        contentType: response.headers.get("content-type") ?? "text/html",
        dataOrigin: "live"
      }
    ];
  }

  async parseRawRecords(rawRecords: RawSourceRecord[]): Promise<RawSourceRecord[]> {
    return rawRecords;
  }

  async normalizeRecords(parsedRecords: RawSourceRecord[]): Promise<ConnectorSyncResult> {
    const html = String(parsedRecords[0]?.payload.html ?? parsedRecords[0]?.rawText ?? "");
    const entries = this.parseDirectory(html);
    const parsingErrors: ValidationIssue[] = [];

    if (!entries.length) {
      parsingErrors.push({
        code: "zero_records",
        level: "error",
        message: "Directory parser returned zero records from a normally active public source."
      });
    }

    const organizations = entries.map<NormalizedOrganizationInput>((entry) => {
      const normalizedCompanyName = normalizeOrganizationName(decodeHtml(entry.rawCompanyName));
      const phone = normalizePhone(entry.phone);
      const email = normalizeEmail(entry.email);
      const website = normalizeWebsite(entry.website);

      return {
        sourceRecordKey: entry.sourceRecordKey,
        rawCompanyName: decodeHtml(entry.rawCompanyName),
        normalizedCompanyName,
        organizationType: "builder",
        sourceConfidence: phone || website ? 74 : 64,
        ingestionMethod: "html_scrape",
        dataOrigin: "live",
        sourceUrl: entry.sourceUrl ?? this.definition.baseUrl,
        serviceArea: entry.serviceArea ? decodeHtml(entry.serviceArea) : undefined,
        street: entry.street ? decodeHtml(entry.street) : undefined,
        city: entry.city ? decodeHtml(entry.city) : undefined,
        state: entry.state ? decodeHtml(entry.state) : undefined,
        zip: entry.zip ? decodeHtml(entry.zip) : undefined,
        notes: entry.notes ? decodeHtml(entry.notes) : undefined,
        contactName: entry.contactName ? decodeHtml(entry.contactName) : undefined,
        phone,
        email,
        website,
        provenance: {
          adapter: this.definition.key,
          baseUrl: this.definition.baseUrl
        },
        contactMethods: [
          phone
            ? {
                type: "phone",
                value: phone,
                normalizedValue: phone,
                verificationStatus: "verified",
                confidence: 82,
                source: this.definition.name,
                sourceUrl: entry.sourceUrl ?? this.definition.baseUrl
              }
            : null,
          email
            ? {
                type: "email",
                value: email,
                normalizedValue: email,
                verificationStatus: "verified",
                confidence: 82,
                source: this.definition.name,
                sourceUrl: entry.sourceUrl ?? this.definition.baseUrl
              }
            : null,
          website
            ? {
                type: "website",
                value: website,
                normalizedValue: website.toLowerCase(),
                verificationStatus: "verified",
                confidence: 76,
                source: this.definition.name,
                sourceUrl: entry.sourceUrl ?? this.definition.baseUrl
              }
            : null
        ].filter(Boolean) as NormalizedOrganizationInput["contactMethods"]
      };
    });

    const completeness = buildCompletenessStats(parsedRecords, organizations);

    return {
      rawRecords: entries.map((entry) => ({
        sourceRecordKey: entry.sourceRecordKey,
        payload: entry as unknown as Record<string, unknown>,
        rawText: JSON.stringify(entry),
        sourceUrl: entry.sourceUrl ?? this.definition.baseUrl,
        contentType: "application/json",
        dataOrigin: "live"
      })),
      permits: [],
      organizations,
      parsingErrors,
      validationIssues: [],
      completeness: {
        ...completeness,
        parseErrorRate: entries.length ? Math.round((parsingErrors.length / entries.length) * 100) : 100
      },
      sourceHealth: {
        status: parsingErrors.length ? "degraded" : "healthy",
        message: parsingErrors.length
          ? "Directory parsed with warnings; review source drift diagnostics."
          : "Directory source parsed successfully.",
        supportsAutomation: true,
        freshnessStatus: "fresh",
        sourceConfidence: organizations.length ? 72 : 40
      },
      syncSummary: {
        organizations: organizations.length,
        contactMethods: organizations.reduce((total, org) => total + (org.contactMethods?.length ?? 0), 0)
      }
    };
  }

  async validateRecords(syncResult: ConnectorSyncResult): Promise<ConnectorSyncResult> {
    const validationIssues = [...syncResult.validationIssues];

    for (const organization of syncResult.organizations) {
      if (!organization.street || !organization.city) {
        validationIssues.push({
          code: "missing_address",
          level: "warning",
          message: `Organization ${organization.rawCompanyName} is missing a full public address.`,
          sourceRecordKey: organization.sourceRecordKey
        });
      }
    }

    return {
      ...syncResult,
      validationIssues,
      sourceHealth: validationIssues.length
        ? { ...syncResult.sourceHealth, status: "degraded" }
        : syncResult.sourceHealth
    };
  }

  async reportHealth(syncResult?: ConnectorSyncResult) {
    return (
      syncResult?.sourceHealth ?? {
        status: "healthy",
        message: "Directory source ready.",
        supportsAutomation: true,
        freshnessStatus: "unknown",
        sourceConfidence: 60
      }
    );
  }
}

const GCRHBA_TARGET_CATEGORIES = new Set([
  "builder/general contractor",
  "insulation",
  "remodeler",
  "roofing",
  "siding",
  "heating & cooling",
  "air duct services",
  "drywall",
  "framing",
  "excavating",
  "concrete",
  "home improvement",
  "windows & doors"
]);

export function parseGcrhbaDirectory(html: string): DirectoryEntry[] {
  const sectionRegex = /<div class='tab-pane'[\s\S]*?<h3>([^<]+)<\/h3>([\s\S]*?)(?=<div class='tab-pane'|$)/gi;
  const cardRegex = /<div class='card directory-card h-100'>[\s\S]*?<\/div>\s*<\/div>/gi;
  const entries: DirectoryEntry[] = [];

  for (const section of html.matchAll(sectionRegex)) {
    const category = decodeHtml(section[1]).toLowerCase();
    if (!GCRHBA_TARGET_CATEGORIES.has(category)) {
      continue;
    }

    for (const cardMatch of section[2].matchAll(cardRegex)) {
      const card = cardMatch[0];
      const website = card.match(/<h5 class='card-title'><a href='([^']+)'/i)?.[1];
      const companyName = card.match(/<h5 class='card-title'><a [^>]*>([^<]+)<\/a><\/h5>/i)?.[1];
      const contactName = card.match(/<h6 class='card-text'>([^<]+)<\/h6>/i)?.[1];
      const phone = card.match(/<p class='card-text'>\s*([^<]+)\s*<\/p>/i)?.[1];
      const street = card.match(/<p class='card-text address-1'>([^<]+)<\/p>/i)?.[1];
      const cityStateZip = card.match(
        /<p class='card-text address-1'>[^<]+<\/p>\s*<p class='card-text'>([^,]+),\s*([A-Z]{2})\s*([0-9]{5})<\/p>/i
      );
      if (!companyName || !street || !cityStateZip) {
        continue;
      }
      const [, city, state, zip] = cityStateZip;
      entries.push({
        sourceRecordKey: `${normalizeOrganizationName(companyName)}:${normalizePhone(phone) ?? city}`,
        rawCompanyName: companyName,
        contactName,
        phone,
        website,
        street,
        city,
        state,
        zip,
        serviceArea: category,
        sourceUrl: website || undefined
      });
    }
  }

  return entries;
}

export function parseGrowCedarValleyDirectory(html: string): DirectoryEntry[] {
  const entries: DirectoryEntry[] = [];
  const anchorMatches = [
    ...html.matchAll(/<a href="https:\/\/growcedarvalley\.chambermaster\.com\/list\/member\/([^"]+)"[^>]*>([^<]+)<\/a>/gi)
  ];

  for (let index = 0; index < anchorMatches.length; index += 1) {
    const current = anchorMatches[index];
    const next = anchorMatches[index + 1];
    const segment = html.slice(current.index ?? 0, next?.index ?? html.length);
    const [, slug, companyName] = current;
    const street = segment.match(/<span class="gz-street-address"[^>]*>([^<]+)<\/span>/i)?.[1];
    const city = segment.match(/<span class="gz-address-city">([^<]+)<\/span>/i)?.[1];
    const phone = segment.match(/<a href="tel:([^"]+)"/i)?.[1] ?? segment.match(/<span>\(?([^<]+)<\/span>/i)?.[1];
    if (!street || !city) {
      continue;
    }
    entries.push({
      sourceRecordKey: slug,
      rawCompanyName: companyName,
      phone,
      street,
      city,
      state: "IA",
      serviceArea: "construction_contractors",
      sourceUrl: `https://growcedarvalley.chambermaster.com/list/member/${slug}`
    });
  }

  return entries;
}
