import { describe, expect, it } from "vitest";

import { parseGcrhbaDirectory, parseGrowCedarValleyDirectory } from "@/lib/domain/adapters/html-directory-adapter";

describe("html directory parsers", () => {
  it("extracts builder records from the GCRHBA directory html", () => {
    const html = `
      <div class='tab-pane' id='tab11'>
        <div class='text-center'><h3>Builder/General Contractor</h3></div>
        <div class='card directory-card h-100'>
          <div class='card-body member-card'>
            <h5 class='card-title'><a href='https://example-builder.com' target='_blank'>Example Builder LLC</a></h5>
            <h6 class='card-text'>Jane Doe</h6>
            <p class='card-text'>(319) 555-1212</p>
            <p class='card-text address-1'>123 Main St</p>
            <p class='card-text'>Cedar Rapids, IA 52401</p>
          </div>
        </div>
      </div>
    `;

    const entries = parseGcrhbaDirectory(html);
    expect(entries).toHaveLength(1);
    expect(entries[0].rawCompanyName).toBe("Example Builder LLC");
    expect(entries[0].contactName).toBe("Jane Doe");
    expect(entries[0].city).toBe("Cedar Rapids");
  });

  it("extracts contractor rows from the Grow Cedar Valley chamber directory html", () => {
    const html = `
      <a href="https://growcedarvalley.chambermaster.com/list/member/cardinal-construction-inc-4033" alt="Cardinal Construction, Inc.">Cardinal Construction, Inc.</a>
      <li class="list-group-item gz-card-address">
        <span class="gz-street-address" itemprop="streetAddress">1246 Martin Rd.</span>
        <span class="gz-address-city">Waterloo</span>
      </li>
      <li class="list-group-item gz-card-phone">
        <a href="tel:3192325400" class="card-link"><span>(319) 232-5400</span></a>
      </li>
    `;

    const entries = parseGrowCedarValleyDirectory(html);
    expect(entries).toHaveLength(1);
    expect(entries[0].sourceRecordKey).toBe("cardinal-construction-inc-4033");
    expect(entries[0].phone).toBe("3192325400");
    expect(entries[0].city).toBe("Waterloo");
  });
});
