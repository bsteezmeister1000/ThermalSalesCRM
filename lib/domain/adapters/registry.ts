import { MonthlyReportAdapter } from "@/lib/domain/adapters/monthly-report-adapter";
import { ManualReviewAdapter } from "@/lib/domain/adapters/manual-review-adapter";
import { cedarRapidsMonthlyPermitFixture } from "@/lib/domain/adapters/fixtures/cedar-rapids-monthly-report";
import type { SourceAdapter } from "@/lib/domain/adapters/base";

export function getAdapters(): SourceAdapter[] {
  return [
    new MonthlyReportAdapter({
      definition: {
        key: "cedar-rapids-monthly-report",
        name: "Cedar Rapids Monthly Permit Report",
        jurisdiction: "Cedar Rapids, IA",
        type: "xlsx_report",
        description:
          "Monthly report adapter. Prefer XLSX/CSV when published, PDF only as fallback.",
        automationMode: "automated"
      },
      fixtureRows: [...cedarRapidsMonthlyPermitFixture]
    }),
    new ManualReviewAdapter({
      key: "linn-county-public-permits",
      name: "Linn County Public Permit Lookup",
      jurisdiction: "Linn County, IA",
      type: "public_search",
      description: "Manual review until stable public export or endpoint is confirmed.",
      automationMode: "manual_review"
    }),
    new ManualReviewAdapter({
      key: "marion-public-permits",
      name: "Marion Permit Search",
      jurisdiction: "Marion, IA",
      type: "public_search",
      description: "Partial manual review. Keep portal URLs and import CSV/XLSX exports.",
      automationMode: "partial_manual"
    }),
    new ManualReviewAdapter({
      key: "iowa-city-public-lookup",
      name: "Iowa City Public Lookup",
      jurisdiction: "Iowa City, IA",
      type: "permit_detail",
      description: "Manual/public review until robust endpoint mapping is approved.",
      automationMode: "partial_manual"
    }),
    new ManualReviewAdapter({
      key: "coralville-public-search",
      name: "Coralville Public Search",
      jurisdiction: "Coralville, IA",
      type: "public_search",
      description: "Manual review only for now to avoid brittle scraping.",
      automationMode: "manual_review"
    })
  ];
}
