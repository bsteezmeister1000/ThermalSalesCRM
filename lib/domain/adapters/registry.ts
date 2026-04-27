import { CoralvilleBuildingReportsAdapter } from "@/lib/domain/adapters/coralville-building-reports-adapter";
import { IowaCityPermitSearchAdapter } from "@/lib/domain/adapters/iowa-city-permit-search-adapter";
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
        automationMode: "automated",
        crawlFrequencyMinutes: 60 * 24 * 30
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
    new IowaCityPermitSearchAdapter(),
    new CoralvilleBuildingReportsAdapter()
  ];
}
