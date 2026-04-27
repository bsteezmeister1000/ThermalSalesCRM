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

const IOWA_CITY_SEARCH_URL = "https://egov.iowa-city.org/energovprod/selfservice#/search";
const IOWA_CITY_API_BASE = "https://egov.iowa-city.org/energovprod/selfservice/api";
const IOWA_CITY_TIME_ZONE = "America/Chicago";
const PERMIT_SEARCH_MODULE = 2;
const PAGE_SIZE = 100;

type IowaCitySearchCriteria = {
  SearchModule: number;
  FilterModule: number;
  Keyword?: string;
  ExactMatch?: boolean;
  PageSize: number;
  PageNumber: number;
  SortBy?: string | null;
  SortAscending?: boolean;
  PermitCriteria: {
    PermitNumber?: string | null;
    PermitTypeId?: string | null;
    PermitStatusId?: string | null;
    ProjectName?: string | null;
    IssueDateFrom?: string | null;
    IssueDateTo?: string | null;
    Address?: string | null;
    Description?: string | null;
    ExpireDateFrom?: string | null;
    ExpireDateTo?: string | null;
    FinalDateFrom?: string | null;
    FinalDateTo?: string | null;
    ApplyDateFrom?: string | null;
    ApplyDateTo?: string | null;
    SearchMainAddress?: boolean;
    ContactId?: string | null;
    TypeId?: string | null;
    WorkClassIds?: string[] | null;
    ParcelNumber?: string | null;
    ExcludeCases?: string[] | null;
    EnableDescriptionSearch?: boolean;
    PageNumber: number;
    PageSize: number;
    SortBy?: string | null;
    SortAscending?: boolean;
  };
};

type IowaCitySearchResponse = {
  Result?: {
    EntityResults?: IowaCityPermitSearchRow[];
    TotalFound?: number;
    TotalPages?: number;
  };
  Success?: boolean;
  ErrorMessage?: string;
};

type IowaCityPermitSearchRow = {
  CaseId: string;
  CaseNumber: string;
  CaseType?: string;
  CaseWorkclass?: string;
  CaseStatus?: string;
  ProjectName?: string;
  IssueDate?: string | null;
  ApplyDate?: string | null;
  ExpireDate?: string | null;
  FinalDate?: string | null;
  AddressDisplay?: string;
  MainParcel?: string;
  Description?: string;
  Address?: {
    FullAddress?: string;
    AddressLine1?: string;
    AddressLine2?: string;
    AddressLine3?: string;
    City?: string | null;
    StateName?: string | null;
    PostalCode?: string;
    PreDirection?: string;
    PostDirection?: string;
    StreetTypeName?: string;
    UnitOrSuite?: string;
  };
};

type IowaCityPermitDetail = {
  PermitId: string;
  PermitNumber?: string;
  PermitType?: string;
  PermitStatus?: string;
  IssueDate?: string | null;
  ExpireDate?: string | null;
  FinalizeDate?: string | null;
  ApplyDate?: string | null;
  WorkClassName?: string;
  Description?: string;
  MainAddress?: string;
  MainParcelNumber?: string;
  ProjectName?: string | null;
  SquareFeet?: number;
  Value?: number;
  MainAddressInfo?: {
    AddressLine1?: string;
    AddressLine2?: string;
    AddressLine3?: string;
    City?: string | null;
    State?: string | null;
    PostalCode?: string;
    PreDirection?: string;
    PostDirection?: string;
    StreetType?: string;
    UnitOrSuite?: string;
  };
};

type IowaCityPermitContact = {
  ContactTypeName?: string;
  GlobalEntityName?: string;
  FirstName?: string;
  LastName?: string;
  IsBilling?: boolean;
  ContactStatus?: string;
  ContactId?: string;
  GlobalEntityId?: string;
};

type IowaCityPermitDetailPayload = {
  searchRow: IowaCityPermitSearchRow;
  permitDetail?: IowaCityPermitDetail;
  contacts?: IowaCityPermitContact[];
  applicantContact?: IowaCityPermitContact;
  dateWindow: IowaCityDateWindow;
  detailLookupError?: string;
  contactLookupError?: string;
};

type IowaCityDateWindow = {
  from: string;
  to: string;
  fromIsoDate: string;
  toIsoDate: string;
};

function normalizeWhitespace(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function getCentralDateParts(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: IOWA_CITY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);

  const valueFor = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(valueFor("year")),
    month: Number(valueFor("month")),
    day: Number(valueFor("day"))
  };
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatPortalDate(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}

export function getPreviousBusinessWeekWindow(now: Date = new Date()): IowaCityDateWindow {
  const centralDate = getCentralDateParts(now);
  const current = new Date(
    Date.UTC(centralDate.year, centralDate.month - 1, centralDate.day, 12)
  );
  const dayOfWeek = current.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const previousMonday = addDays(current, -(daysSinceMonday + 7));
  const previousFriday = addDays(previousMonday, 4);

  return {
    from: formatPortalDate(previousMonday),
    to: formatPortalDate(previousFriday),
    fromIsoDate: formatIsoDate(previousMonday),
    toIsoDate: formatIsoDate(previousFriday)
  };
}

function parseDateOnly(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().slice(0, 10);
}

function isWithinWindow(value: string | null | undefined, window: IowaCityDateWindow) {
  const dateOnly = parseDateOnly(value);
  return Boolean(dateOnly && dateOnly >= window.fromIsoDate && dateOnly <= window.toIsoDate);
}

function assertStrictPermitSearchCriteria(
  criteria: IowaCitySearchCriteria,
  window: IowaCityDateWindow
) {
  if (criteria.SearchModule !== PERMIT_SEARCH_MODULE) {
    throw new Error("Refusing Iowa City search: SearchModule must be Permit (2).");
  }

  if (criteria.PageSize !== PAGE_SIZE || criteria.PermitCriteria.PageSize !== PAGE_SIZE) {
    throw new Error("Refusing Iowa City search: page size must be locked to 100.");
  }

  if (
    criteria.PermitCriteria.ApplyDateFrom !== window.from ||
    criteria.PermitCriteria.ApplyDateTo !== window.to
  ) {
    throw new Error("Refusing Iowa City search: applied date window is missing or incorrect.");
  }
}

export function buildPermitSearchCriteria(
  baseCriteria: IowaCitySearchCriteria,
  window: IowaCityDateWindow,
  pageNumber: number
) {
  const criteria = structuredClone(baseCriteria);

  criteria.SearchModule = PERMIT_SEARCH_MODULE;
  criteria.FilterModule = 0;
  criteria.Keyword = "";
  criteria.ExactMatch = true;
  criteria.PageSize = PAGE_SIZE;
  criteria.PageNumber = pageNumber;
  criteria.SortBy = "relevance";
  criteria.SortAscending = true;
  criteria.PermitCriteria = {
    ...criteria.PermitCriteria,
    PermitTypeId: "none",
    PermitStatusId: "none",
    ApplyDateFrom: window.from,
    ApplyDateTo: window.to,
    PageNumber: pageNumber,
    PageSize: PAGE_SIZE,
    SortBy: "relevance",
    SortAscending: true
  };

  assertStrictPermitSearchCriteria(criteria, window);
  return criteria;
}

function getAddressParts(
  row: IowaCityPermitSearchRow,
  detail?: IowaCityPermitDetail
) {
  const address = detail?.MainAddressInfo;
  const fallback = row.Address;
  const streetParts = [
    address?.AddressLine1 ?? fallback?.AddressLine1,
    address?.PreDirection ?? fallback?.PreDirection,
    address?.AddressLine2 ?? fallback?.AddressLine2,
    address?.StreetType ?? fallback?.StreetTypeName,
    address?.PostDirection ?? fallback?.PostDirection,
    address?.AddressLine3 ?? fallback?.AddressLine3,
    address?.UnitOrSuite ?? fallback?.UnitOrSuite
  ];

  const address1 =
    normalizeWhitespace(streetParts.filter(Boolean).join(" ")) ||
    normalizeWhitespace(detail?.MainAddress?.split(/\r?\n/)[0]) ||
    normalizeWhitespace(row.AddressDisplay);

  return {
    address1,
    city: normalizeWhitespace(address?.City ?? fallback?.City ?? "Iowa City") || "Iowa City",
    state: normalizeWhitespace(address?.State ?? fallback?.StateName ?? "IA") || "IA",
    zip: normalizeWhitespace(address?.PostalCode ?? fallback?.PostalCode)
  };
}

function isApplicantContact(contact: IowaCityPermitContact) {
  return normalizeWhitespace(contact.ContactTypeName).toLowerCase() === "applicant";
}

function getContactDisplayName(contact?: IowaCityPermitContact) {
  if (!contact) {
    return undefined;
  }

  const entityName = normalizeWhitespace(contact.GlobalEntityName);
  if (entityName) {
    return entityName;
  }

  const personName = normalizeWhitespace([contact.FirstName, contact.LastName].filter(Boolean).join(" "));
  return personName || undefined;
}

function getContactPersonName(contact?: IowaCityPermitContact) {
  if (!contact) {
    return undefined;
  }

  return normalizeWhitespace([contact.FirstName, contact.LastName].filter(Boolean).join(" ")) || undefined;
}

function parseNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

async function iowaCityFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${IOWA_CITY_API_BASE}${path}`, {
    ...init,
    headers: {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json;charset=UTF-8",
      referer: "https://egov.iowa-city.org/energovprod/selfservice",
      tenantid: "3",
      tenantname: "energovProd",
      "tyler-tenant-culture": "en-US",
      "tyler-tenanturl": "Home",
      "user-agent": "ThermalSalesCRM/1.0 Iowa City permit search collector",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`Iowa City request failed for ${path}: ${response.status}`);
  }

  return response.json();
}

async function fetchDefaultCriteria() {
  const payload = await iowaCityFetch("/energov/search/criteria");
  if (payload.Success === false) {
    throw new Error(payload.ErrorMessage || "Iowa City search criteria request failed.");
  }
  return payload.Result as IowaCitySearchCriteria;
}

async function fetchPermitSearchPage(
  baseCriteria: IowaCitySearchCriteria,
  window: IowaCityDateWindow,
  pageNumber: number
) {
  const criteria = buildPermitSearchCriteria(baseCriteria, window, pageNumber);
  const payload = (await iowaCityFetch("/energov/search/search", {
    method: "POST",
    body: JSON.stringify(criteria)
  })) as IowaCitySearchResponse;

  if (payload.Success === false) {
    throw new Error(payload.ErrorMessage || "Iowa City permit search failed.");
  }

  const rows = payload.Result?.EntityResults ?? [];
  const outOfWindow = rows.find((row) => !isWithinWindow(row.ApplyDate, window));
  if (outOfWindow) {
    throw new Error(
      `Refusing Iowa City search results: ${outOfWindow.CaseNumber} has ApplyDate ${outOfWindow.ApplyDate}, outside ${window.from}-${window.to}.`
    );
  }

  return {
    rows,
    totalFound: payload.Result?.TotalFound ?? rows.length,
    totalPages: payload.Result?.TotalPages ?? 1
  };
}

async function fetchPermitDetail(permitId: string) {
  const payload = await iowaCityFetch(`/energov/permits/${permitId}`);
  if (payload.Success === false) {
    throw new Error(payload.ErrorMessage || `Iowa City permit detail failed for ${permitId}.`);
  }
  return payload.Result as IowaCityPermitDetail;
}

async function fetchPermitContacts(permitId: string) {
  const payload = await iowaCityFetch("/energov/entity/contacts/search/search", {
    method: "POST",
    body: JSON.stringify({
      PageNumber: 1,
      PageSize: PAGE_SIZE,
      SortField: "",
      IsSortedInAscendingOrder: true,
      ModuleId: 1,
      EntityId: permitId
    })
  });

  if (payload.Success === false && payload.StatusCode !== 204) {
    throw new Error(payload.ErrorMessage || `Iowa City contacts request failed for ${permitId}.`);
  }

  return (payload.Result ?? []) as IowaCityPermitContact[];
}

export class IowaCityPermitSearchAdapter implements SourceAdapter {
  definition: SourceAdapterDefinition = {
    key: "iowa-city-permit-search",
    name: "Iowa City Permit Search",
    jurisdiction: "Iowa City, IA",
    type: "public_search",
    description:
      "Weekly collector for Iowa City permit applications from the EnerGov public permit search.",
    automationMode: "automated",
    crawlFrequencyMinutes: 60 * 24 * 7
  };

  async fetchIndex(): Promise<DiscoveredRecord[]> {
    const window = getPreviousBusinessWeekWindow();
    const baseCriteria = await fetchDefaultCriteria();
    const firstPage = await fetchPermitSearchPage(baseCriteria, window, 1);
    const records = [...firstPage.rows];

    for (let page = 2; page <= firstPage.totalPages; page += 1) {
      const nextPage = await fetchPermitSearchPage(baseCriteria, window, page);
      records.push(...nextPage.rows);
    }

    return records.map((permit) => ({
      sourceRecordKey: permit.CaseId,
      indexUrl: IOWA_CITY_SEARCH_URL,
      title: `${permit.CaseNumber} ${permit.AddressDisplay ?? ""}`.trim(),
      metadata: {
        searchRow: permit,
        dateWindow: window,
        totalFound: firstPage.totalFound
      }
    }));
  }

  async fetchDetail(record: DiscoveredRecord): Promise<RawDetail> {
    const metadata = record.metadata as unknown as {
      searchRow: IowaCityPermitSearchRow;
      dateWindow: IowaCityDateWindow;
    };
    const payload: IowaCityPermitDetailPayload = {
      searchRow: metadata.searchRow,
      dateWindow: metadata.dateWindow
    };

    try {
      payload.permitDetail = await fetchPermitDetail(metadata.searchRow.CaseId);
    } catch (error) {
      payload.detailLookupError =
        error instanceof Error ? error.message : "Unable to fetch Iowa City permit detail.";
    }

    try {
      payload.contacts = await fetchPermitContacts(metadata.searchRow.CaseId);
      payload.applicantContact = payload.contacts.find(isApplicantContact);
    } catch (error) {
      payload.contactLookupError =
        error instanceof Error ? error.message : "Unable to fetch Iowa City permit contacts.";
    }

    return {
      sourceUrl: `https://egov.iowa-city.org/energovprod/selfservice#/permit/${metadata.searchRow.CaseId}`,
      payload: payload as unknown as Record<string, unknown>,
      rawText: JSON.stringify(payload)
    };
  }

  async parse(detail: RawDetail): Promise<NormalizedPermitInput[]> {
    const payload = detail.payload as unknown as IowaCityPermitDetailPayload;
    const row = payload.searchRow;
    const permitDetail = payload.permitDetail;

    if (!isWithinWindow(row.ApplyDate, payload.dateWindow)) {
      throw new Error(
        `Refusing to parse Iowa City permit ${row.CaseNumber}: ApplyDate is outside the locked search window.`
      );
    }

    const address = getAddressParts(row, permitDetail);
    const normalizedAddress = address.address1 ? normalizeAddress(address) : undefined;
    const permitNumber = permitDetail?.PermitNumber ?? row.CaseNumber;
    const applicantName = getContactDisplayName(payload.applicantContact);
    const applicantContactName = getContactPersonName(payload.applicantContact);
    const valuation = parseNumber(permitDetail?.Value);

    return [
      {
        normalizedKey: `${this.definition.key}:${row.CaseId}`.toLowerCase(),
        permitNumber,
        permitType: permitDetail?.PermitType ?? row.CaseType,
        workClass: permitDetail?.WorkClassName ?? row.CaseWorkclass,
        issueDate: permitDetail?.IssueDate ? new Date(permitDetail.IssueDate) : undefined,
        applicationDate: permitDetail?.ApplyDate
          ? new Date(permitDetail.ApplyDate)
          : row.ApplyDate
            ? new Date(row.ApplyDate)
            : undefined,
        status: permitDetail?.PermitStatus ?? row.CaseStatus,
        address1: address.address1 || undefined,
        city: address.city,
        state: address.state,
        zip: address.zip || undefined,
        parcelNumber: permitDetail?.MainParcelNumber ?? row.MainParcel,
        projectName: permitDetail?.ProjectName ?? row.ProjectName,
        projectDescription: permitDetail?.Description ?? row.Description,
        valuation,
        permitUrl: detail.sourceUrl,
        sourceConfidence: normalizedAddress ? 78 : 64,
        provenance: {
          adapter: this.definition.key,
          lineage: "iowa_city_energov_permit_search",
          caseId: row.CaseId,
          caseNumber: row.CaseNumber,
          appliedDateWindow: payload.dateWindow,
          csvExportEquivalent: true,
          sourceSearchUrl: IOWA_CITY_SEARCH_URL,
          applicantName,
          applicantContactName,
          applicantFirstName: payload.applicantContact?.FirstName,
          applicantLastName: payload.applicantContact?.LastName,
          applicantContactType: payload.applicantContact?.ContactTypeName,
          detailLookupError: payload.detailLookupError,
          contactLookupError: payload.contactLookupError
        },
        property:
          address.address1 && normalizedAddress
            ? {
                normalizedAddressKey: normalizedAddress.normalizedKey,
                address1: address.address1,
                city: address.city,
                state: address.state,
                zip: address.zip || undefined,
                parcelNumber: permitDetail?.MainParcelNumber ?? row.MainParcel
              }
            : undefined,
        organizations: applicantName
          ? [
              {
                name: applicantName,
                normalizedName: normalizeOrganizationName(applicantName),
                type: "builder",
                relationshipType: "builder",
                confidence: 72,
                contacts: applicantContactName
                  ? [
                      {
                        fullName: applicantContactName,
                        firstName: payload.applicantContact?.FirstName,
                        lastName: payload.applicantContact?.LastName,
                        roleTitle: payload.applicantContact?.ContactTypeName ?? "Applicant",
                        source: this.definition.key,
                        sourceUrl: detail.sourceUrl,
                        provenance: {
                          contactId: payload.applicantContact?.ContactId,
                          globalEntityId: payload.applicantContact?.GlobalEntityId,
                          contactStatus: payload.applicantContact?.ContactStatus,
                          isBilling: payload.applicantContact?.IsBilling
                        },
                        confidence: 72
                      }
                    ]
                  : []
              }
            ]
          : [],
        reviewFlags: applicantName
          ? [
              {
                flag: "parse_uncertainty",
                detail:
                  "Created from Iowa City's permit search; applicant is mapped as builder and should be spot-checked."
              }
            ]
          : [
              {
                flag: "missing_builder",
                detail: "No Applicant contact was found for this Iowa City permit."
              },
              {
                flag: "parse_uncertainty",
                detail: "Created from Iowa City's permit search and should be spot-checked."
              }
            ]
      }
    ];
  }

  async healthcheck(): Promise<SourceHealth> {
    try {
      const window = getPreviousBusinessWeekWindow();
      const baseCriteria = await fetchDefaultCriteria();
      const page = await fetchPermitSearchPage(baseCriteria, window, 1);

      return {
        status: "healthy",
        message: `Iowa City permit search returned ${page.totalFound} permits applied ${window.from}-${window.to}.`,
        supportsAutomation: true
      };
    } catch (error) {
      return {
        status: "failed",
        message:
          error instanceof Error ? error.message : "Unable to reach Iowa City's permit search.",
        supportsAutomation: true
      };
    }
  }
}
