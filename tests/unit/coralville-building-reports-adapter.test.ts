import { describe, expect, it } from "vitest";

import {
  parseCoralvilleArchiveHtml,
  parseCoralvillePermitText
} from "@/lib/domain/adapters/coralville-building-reports-adapter";

describe("Coralville building reports adapter", () => {
  it("discovers only current-year archive entries", () => {
    const html = `
      <a href="Archive.aspx?ADID=3020" target="_blank"><span>Building Report Summary - March 2026</span></a>
      <a href="Archive.aspx?ADID=3015" target="_blank"><span>Building Report Summary - February 2026</span></a>
      <a href="Archive.aspx?ADID=3012" target="_blank"><span>Building Report Summary - January 2026</span></a>
      <a href="Archive.aspx?ADID=3009" target="_blank"><span>Building Report Summary - December 2025</span></a>
    `;

    const entries = parseCoralvilleArchiveHtml(html, 2026);

    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.adid)).toEqual(["3020", "3015", "3012"]);
    expect(entries[0]?.pdfUrl).toBe("https://www.coralville.org/ArchiveCenter/ViewFile/Item/3020");
  });

  it("parses permit rows from Coralville PDF text", () => {
    const text = `
      26-3622
      3/20/2026
      HENN REVOCABLE TRUST
      2136 CHAD DR
      Accessory Building
      $90,000.00
      $970.35
      $90,000.00
      $970.35
      Totals for Accessory Building
      26-3615
      3/23/2026
      LY, KIMBERLY ANN
      2468 10TH ST
      Certificate of Occupancy and
      Zoning Compliance
      $0.00
      $0.00
      26-3606
      3/20/2026
      JAJESSKA, LC
      2896 Eastridge Ter Unit A
      2896 Eastridge Ter Unit B
      2896 Eastridge Ter Unit C
      2896 Eastridge Ter Unit D
      Townhome Condominiums
      $800,000.00
      $4,892.85
      Report Totals
      $27,028.35
      $3,294,814.00
    `;

    const permits = parseCoralvillePermitText(text);

    expect(permits).toHaveLength(3);
    expect(permits[0]).toMatchObject({
      permitNumber: "26-3622",
      ownerName: "HENN REVOCABLE TRUST",
      buildingType: "Accessory Building",
      valuation: 90000
    });
    expect(permits[1]).toMatchObject({
      permitNumber: "26-3615",
      buildingType: "Certificate of Occupancy and Zoning Compliance",
      addressLines: ["2468 10TH ST"]
    });
    expect(permits[2]).toMatchObject({
      permitNumber: "26-3606",
      ownerName: "JAJESSKA, LC",
      buildingType: "Townhome Condominiums"
    });
    expect(permits[2]?.addressLines).toHaveLength(4);
  });
});
