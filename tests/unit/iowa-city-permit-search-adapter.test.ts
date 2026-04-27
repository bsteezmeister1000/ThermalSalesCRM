import { describe, expect, it } from "vitest";

import {
  buildPermitSearchCriteria,
  getPreviousBusinessWeekWindow,
  IowaCityPermitSearchAdapter
} from "@/lib/domain/adapters/iowa-city-permit-search-adapter";

describe("IowaCityPermitSearchAdapter", () => {
  it("computes the previous Monday-Friday applied-date window", () => {
    expect(getPreviousBusinessWeekWindow(new Date("2026-04-27T18:00:00Z"))).toEqual({
      from: "04/20/2026",
      to: "04/24/2026",
      fromIsoDate: "2026-04-20",
      toIsoDate: "2026-04-24"
    });
  });

  it("locks the permit search criteria to permit module and applied dates", () => {
    const window = getPreviousBusinessWeekWindow(new Date("2026-04-27T18:00:00Z"));
    const criteria = buildPermitSearchCriteria(
      {
        SearchModule: 1,
        FilterModule: 0,
        PageSize: 0,
        PageNumber: 0,
        PermitCriteria: {
          PageSize: 0,
          PageNumber: 0
        }
      },
      window,
      1
    );

    expect(criteria).toMatchObject({
      SearchModule: 2,
      FilterModule: 0,
      PageSize: 100,
      PageNumber: 1,
      PermitCriteria: {
        ApplyDateFrom: "04/20/2026",
        ApplyDateTo: "04/24/2026",
        PageSize: 100,
        PageNumber: 1
      }
    });
  });

  it("normalizes an EnerGov permit search result with Applicant contact as builder", async () => {
    const adapter = new IowaCityPermitSearchAdapter();
    const permits = await adapter.parse({
      sourceUrl:
        "https://egov.iowa-city.org/energovprod/selfservice#/permit/fdb3dbfd-e85c-4a40-b73d-976452cd6261",
      rawText: "{}",
      payload: {
        dateWindow: {
          from: "04/20/2026",
          to: "04/24/2026",
          fromIsoDate: "2026-04-20",
          toIsoDate: "2026-04-24"
        },
        searchRow: {
          CaseId: "fdb3dbfd-e85c-4a40-b73d-976452cd6261",
          CaseNumber: "BLDR26-0122",
          CaseType: "Residential Buildings",
          CaseWorkclass: "Residential Buildings",
          CaseStatus: "In Review",
          ApplyDate: "2026-04-20T11:58:35.137",
          AddressDisplay: "5 DURANGO PL Iowa City IA 52246",
          MainParcel: "1113406008",
          Description: "Garage header repair"
        },
        permitDetail: {
          PermitId: "fdb3dbfd-e85c-4a40-b73d-976452cd6261",
          PermitNumber: "BLDR26-0122",
          PermitType: "Residential Buildings",
          PermitStatus: "In Review",
          ApplyDate: "2026-04-20T16:58:35.137Z",
          WorkClassName: "Residential Buildings",
          Description: "Garage header repair",
          MainAddress: "5 DURANGO PL \r\nIowa City, IA 52246",
          MainParcelNumber: "1113406008",
          SquareFeet: 2000,
          Value: 0,
          MainAddressInfo: {
            AddressLine1: "5",
            AddressLine2: "DURANGO",
            StreetType: "PL",
            City: "Iowa City",
            State: "IA",
            PostalCode: "52246"
          }
        },
        applicantContact: {
          ContactTypeName: "Applicant",
          GlobalEntityName: "Madsen Custom Homes",
          FirstName: "Mark",
          LastName: "Stagg"
        }
      }
    });

    expect(permits[0]).toMatchObject({
      normalizedKey:
        "iowa-city-permit-search:fdb3dbfd-e85c-4a40-b73d-976452cd6261",
      permitNumber: "BLDR26-0122",
      permitType: "Residential Buildings",
      workClass: "Residential Buildings",
      status: "In Review",
      applicationDate: new Date("2026-04-20T16:58:35.137Z"),
      address1: "5 DURANGO PL",
      city: "Iowa City",
      state: "IA",
      zip: "52246",
      parcelNumber: "1113406008",
      organizations: [
        {
          name: "Madsen Custom Homes",
          normalizedName: "madsen custom homes",
          type: "builder",
          relationshipType: "builder",
          confidence: 72,
          contacts: [
            {
              fullName: "Mark Stagg",
              firstName: "Mark",
              lastName: "Stagg",
              roleTitle: "Applicant",
              source: "iowa-city-permit-search",
              sourceUrl:
                "https://egov.iowa-city.org/energovprod/selfservice#/permit/fdb3dbfd-e85c-4a40-b73d-976452cd6261",
              provenance: {
                contactId: undefined,
                contactStatus: undefined,
                globalEntityId: undefined,
                isBilling: undefined
              },
              confidence: 72
            }
          ]
        }
      ]
    });
  });

  it("refuses to parse rows outside the locked applied-date window", async () => {
    const adapter = new IowaCityPermitSearchAdapter();

    await expect(
      adapter.parse({
        sourceUrl: "https://egov.iowa-city.org/energovprod/selfservice#/permit/old",
        rawText: "{}",
        payload: {
          dateWindow: {
            from: "04/20/2026",
            to: "04/24/2026",
            fromIsoDate: "2026-04-20",
            toIsoDate: "2026-04-24"
          },
          searchRow: {
            CaseId: "old",
            CaseNumber: "ABN01-00001",
            ApplyDate: "2001-05-15T00:00:00"
          }
        }
      })
    ).rejects.toThrow(/outside the locked search window/);
  });
});
