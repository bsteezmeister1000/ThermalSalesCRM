import type { SourceAdapter } from "@/lib/domain/adapters/base";
import {
  HtmlDirectoryAdapter,
  parseGcrhbaDirectory,
  parseGrowCedarValleyDirectory
} from "@/lib/domain/adapters/html-directory-adapter";
import { cedarRapidsMonthlyPermitFixture } from "@/lib/domain/adapters/fixtures/cedar-rapids-monthly-report";
import { ManualReviewAdapter } from "@/lib/domain/adapters/manual-review-adapter";
import { MonthlyReportAdapter } from "@/lib/domain/adapters/monthly-report-adapter";

export function getAdapters(): SourceAdapter[] {
  return [
    new MonthlyReportAdapter({
      definition: {
        key: "cedar-rapids-monthly-report",
        name: "Cedar Rapids Permit Reports",
        jurisdiction: "Cedar Rapids, IA",
        type: "xlsx_report",
        accessMethod: "report_download",
        baseUrl:
          "https://www.cedar-rapids.org/local_government/departments_a_-_f/building_services/building_and_trades/permit_reports.php",
        description: "Structured monthly permit report source. Prefer XLSX/CSV when published, PDF only as fallback.",
        automationMode: "automated",
        activeStatus: "active",
        parserName: "monthly-report-fixture",
        parserVersion: "2.0.0",
        expectedUpdateFrequencyHours: 24,
        expectedFields: ["permit_number", "permit_type", "issue_date", "address", "city", "valuation", "builder_name"]
      },
      fixtureRows: [...cedarRapidsMonthlyPermitFixture]
    }),
    new HtmlDirectoryAdapter({
      definition: {
        key: "gcrhba-member-directory",
        name: "Greater Cedar Rapids HBA Directory",
        jurisdiction: "Cedar Rapids Metro, IA",
        type: "builder_directory",
        accessMethod: "html_scrape",
        baseUrl: "https://gcrhba.org/index.php/directory/",
        description: "Public member directory with builder and trade partner listings relevant to insulation outreach.",
        automationMode: "automated",
        activeStatus: "active",
        parserName: "gcrhba-directory-html",
        parserVersion: "1.0.0",
        expectedUpdateFrequencyHours: 168,
        expectedFields: ["company_name", "contact_name", "phone", "street", "city", "website"]
      },
      parseDirectory: parseGcrhbaDirectory
    }),
    new HtmlDirectoryAdapter({
      definition: {
        key: "grow-cedar-valley-contractors",
        name: "Grow Cedar Valley Construction Contractors",
        jurisdiction: "Cedar Falls / Waterloo, IA",
        type: "builder_directory",
        accessMethod: "html_scrape",
        baseUrl: "https://growcedarvalley.chambermaster.com/list/QL/construction-contractors-58.htm",
        description: "Public chamber directory category for construction contractors in the Cedar Valley market.",
        automationMode: "automated",
        activeStatus: "active",
        parserName: "grow-cedar-valley-directory-html",
        parserVersion: "1.0.0",
        expectedUpdateFrequencyHours: 168,
        expectedFields: ["company_name", "street", "city", "phone"]
      },
      parseDirectory: parseGrowCedarValleyDirectory
    }),
    new ManualReviewAdapter({
      key: "cedar-rapids-building-services",
      name: "Cedar Rapids Building Services",
      jurisdiction: "Cedar Rapids, IA",
      type: "public_search",
      accessMethod: "permit_portal_search",
      baseUrl: "https://www.cedar-rapids.org/local_government/departments_a_-_f/building_services/index.php",
      description: "Public building services portal. Use as a secondary permit lookup alongside downloadable reports.",
      automationMode: "partial_manual",
      activeStatus: "candidate",
      expectedUpdateFrequencyHours: 24,
      expectedFields: ["permit_number", "status", "address", "permit_type"]
    }),
    new ManualReviewAdapter({
      key: "linn-county-planning-development",
      name: "Linn County Planning & Development",
      jurisdiction: "Linn County, IA",
      type: "public_search",
      accessMethod: "permit_portal_search",
      baseUrl: "https://www.linncountyiowa.gov/146/Planning-Development",
      description: "County planning and development permit entry point awaiting stable public extraction.",
      automationMode: "manual_review",
      activeStatus: "manual_only"
    }),
    new ManualReviewAdapter({
      key: "linn-county-building-division",
      name: "Linn County Building Division",
      jurisdiction: "Linn County, IA",
      type: "public_search",
      accessMethod: "permit_portal_search",
      baseUrl: "https://www.linncountyiowa.gov/1009/Building-Division",
      description: "County building division portal. Register for monitoring and manual import fallback.",
      automationMode: "manual_review",
      activeStatus: "manual_only"
    }),
    new ManualReviewAdapter({
      key: "johnson-county-apps",
      name: "Johnson County Public Apps",
      jurisdiction: "Johnson County, IA",
      type: "public_search",
      accessMethod: "permit_portal_search",
      baseUrl: "https://www.johnsoncountyiowa.gov/apps",
      description: "Johnson County public apps landing page for permits and development workflows.",
      automationMode: "manual_review",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "johnson-county-pds",
      name: "Johnson County Department of PDS",
      jurisdiction: "Johnson County, IA",
      type: "public_search",
      accessMethod: "permit_portal_search",
      baseUrl: "https://www.johnsoncountyiowa.gov/department-of-pds",
      description: "Planning, development, and sustainability source awaiting stable public extraction.",
      automationMode: "manual_review",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "iowa-city-building-inspection",
      name: "Iowa City Building Inspection Services",
      jurisdiction: "Iowa City, IA",
      type: "permit_detail",
      accessMethod: "permit_portal_search",
      baseUrl: "https://www.icgov.org/business/building-inspection-services",
      description: "Public permit information source awaiting approved stable connector.",
      automationMode: "partial_manual",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "iowa-city-urban-planning-permits",
      name: "Iowa City Urban Planning Permit Information",
      jurisdiction: "Iowa City, IA",
      type: "planning_agenda",
      accessMethod: "html_scrape",
      baseUrl:
        "https://www.icgov.org/government/departments-and-divisions/neighborhood-and-development-services/development-services/urban-planning/permit-information",
      description: "Planning and permit information source for early-stage project visibility.",
      automationMode: "manual_review",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "coralville-building-permits",
      name: "Coralville Building Permits",
      jurisdiction: "Coralville, IA",
      type: "public_search",
      accessMethod: "permit_portal_search",
      baseUrl: "https://www.coralville.org/210/Building-Permits",
      description: "Public permit page requiring stable endpoint discovery before automation.",
      automationMode: "manual_review",
      activeStatus: "manual_only"
    }),
    new ManualReviewAdapter({
      key: "north-liberty-building-permits",
      name: "North Liberty Building Inspection Permits",
      jurisdiction: "North Liberty, IA",
      type: "public_search",
      accessMethod: "permit_portal_search",
      baseUrl: "https://northlibertyiowa.org/departments/building-inspection/permits/",
      description: "Public permits source for North Liberty awaiting automation review.",
      automationMode: "manual_review",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "tiffin-permit-forms",
      name: "Tiffin Permit Forms",
      jurisdiction: "Tiffin, IA",
      type: "public_search",
      accessMethod: "report_download",
      baseUrl: "https://www.tiffin-iowa.org/city_government/permit_forms.php",
      description: "Permit forms and public permit resources for Tiffin. Use with iWorQ portal review.",
      automationMode: "partial_manual",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "tiffin-iworq-portal",
      name: "Tiffin iWorQ Portal",
      jurisdiction: "Tiffin, IA",
      type: "public_search",
      accessMethod: "permit_portal_search",
      baseUrl: "https://tiffin23.portal.iworq.net/portalhome/tiffin23",
      description: "Public iWorQ permit portal with strong future ROI once approved connector mapping is in place.",
      automationMode: "partial_manual",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "marion-building-services",
      name: "Marion Building Permit Information",
      jurisdiction: "Marion, IA",
      type: "public_search",
      accessMethod: "permit_portal_search",
      baseUrl:
        "https://www.cityofmarion.org/government/community-development/building-services/building-permit-information",
      description: "Marion permit information source awaiting stable extraction.",
      automationMode: "manual_review",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "hiawatha-permits-inspections",
      name: "Hiawatha Community Development Permits & Inspections",
      jurisdiction: "Hiawatha, IA",
      type: "public_search",
      accessMethod: "permit_portal_search",
      baseUrl: "https://www.hiawatha-iowa.com/departments/community-development/permits-inspections/",
      description: "Hiawatha permit and inspection source registered for manual review.",
      automationMode: "manual_review",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "cedar-falls-permits",
      name: "Cedar Falls Permit Information",
      jurisdiction: "Cedar Falls, IA",
      type: "public_search",
      accessMethod: "permit_portal_search",
      baseUrl: "https://www.cedarfalls.com/permit",
      description: "Cedar Falls permit source registered pending structured access discovery.",
      automationMode: "manual_review",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "waterloo-building-inspections",
      name: "Waterloo Building Inspections",
      jurisdiction: "Waterloo, IA",
      type: "public_search",
      accessMethod: "permit_portal_search",
      baseUrl: "https://www.cityofwaterlooiowa.com/departments/building_inspections/index.php",
      description: "Waterloo building inspections source registered pending public extraction mapping.",
      automationMode: "manual_review",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "linn-county-assessor",
      name: "Linn County Assessor",
      jurisdiction: "Linn County, IA",
      type: "assessor",
      accessMethod: "manual_review",
      baseUrl: "https://linn.iowaassessors.com/",
      description: "Assessor source for property enrichment and owner data once lookup workflow is stabilized.",
      automationMode: "manual_review",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "cedar-rapids-assessor",
      name: "Cedar Rapids Assessor",
      jurisdiction: "Cedar Rapids, IA",
      type: "assessor",
      accessMethod: "manual_review",
      baseUrl: "https://cedarrapids.iowaassessors.com/",
      description: "City assessor source for parcel enrichment; registered pending controlled access workflow.",
      automationMode: "manual_review",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "johnson-county-assessor",
      name: "Johnson County Assessor",
      jurisdiction: "Johnson County, IA",
      type: "assessor",
      accessMethod: "manual_review",
      baseUrl: "https://www.johnsoncountyiowa.gov/department-of-county-assessor",
      description: "County assessor landing page for property enrichment workflows.",
      automationMode: "manual_review",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "iowa-city-assessor",
      name: "Iowa City Assessor",
      jurisdiction: "Iowa City, IA",
      type: "assessor",
      accessMethod: "manual_review",
      baseUrl: "https://iowacity.iowaassessors.com/",
      description: "Iowa City assessor records source awaiting controlled enrichment connector.",
      automationMode: "manual_review",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "black-hawk-assessor",
      name: "Black Hawk County Assessor",
      jurisdiction: "Black Hawk County, IA",
      type: "assessor",
      accessMethod: "manual_review",
      baseUrl: "https://www.blackhawkcounty.iowa.gov/149/Assessor",
      description: "Expansion-market assessor source for Waterloo / Cedar Falls property enrichment.",
      automationMode: "manual_review",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "linn-county-gis-open-data",
      name: "Linn County GIS Open Data",
      jurisdiction: "Linn County, IA",
      type: "open_data",
      accessMethod: "open_data",
      baseUrl: "https://opendata-linncounty-gis.opendata.arcgis.com/datasets/7c7c6bb7c10f40d7bc2e50937ce9cbab",
      description: "GIS open data endpoint for parcel and clustering enrichment once mapped.",
      automationMode: "partial_manual",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "johnson-county-gis-interactive",
      name: "Johnson County GIS Interactive Maps",
      jurisdiction: "Johnson County, IA",
      type: "gis_portal",
      accessMethod: "manual_review",
      baseUrl: "https://gis.johnsoncountyiowa.gov/piv/",
      description: "Interactive GIS portal for Johnson County property and cluster enrichment.",
      automationMode: "manual_review",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "black-hawk-open-data",
      name: "Black Hawk County Open Data",
      jurisdiction: "Black Hawk County, IA",
      type: "open_data",
      accessMethod: "open_data",
      baseUrl: "https://opendata.blackhawkcounty.iowa.gov/",
      description: "Black Hawk County open data portal for future parcel and permit enrichment.",
      automationMode: "partial_manual",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "cedar-rapids-legistar",
      name: "Cedar Rapids Legistar",
      jurisdiction: "Cedar Rapids, IA",
      type: "planning_agenda",
      accessMethod: "html_scrape",
      baseUrl: "https://cedar-rapids.legistar.com",
      description: "Planning and council agendas for early-stage development intelligence.",
      automationMode: "partial_manual",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "iowa-city-legistar",
      name: "Iowa City Legistar",
      jurisdiction: "Iowa City, IA",
      type: "planning_agenda",
      accessMethod: "html_scrape",
      baseUrl: "https://iowacity.legistar.com",
      description: "Iowa City agenda source for early-stage project detection.",
      automationMode: "partial_manual",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "dial-contractor-licenses",
      name: "Iowa DIAL Contractor Licenses",
      jurisdiction: "Iowa",
      type: "contractor_registry",
      accessMethod: "manual_review",
      baseUrl: "https://dial.iowa.gov/licenses/building/contractors",
      description: "State contractor licensing source for manual or authorized validation only.",
      automationMode: "manual_review",
      activeStatus: "manual_only"
    }),
    new ManualReviewAdapter({
      key: "hba-of-ic-directory",
      name: "HBA of Iowa City Member Directory",
      jurisdiction: "Iowa City Corridor, IA",
      type: "builder_directory",
      accessMethod: "html_scrape",
      baseUrl: "https://hbaofic.org/member-directory/",
      description: "Public member directory registered for future builder discovery coverage.",
      automationMode: "partial_manual",
      activeStatus: "candidate"
    }),
    new ManualReviewAdapter({
      key: "cedar-rapids-contractors-directory",
      name: "Cedar Rapids Contractors Directory",
      jurisdiction: "Cedar Rapids, IA",
      type: "builder_directory",
      accessMethod: "html_scrape",
      baseUrl: "https://www.cedarrapids.org/directory/sub-category/contractors/",
      description: "Public city directory of contractors and construction firms awaiting targeted parsing.",
      automationMode: "partial_manual",
      activeStatus: "candidate"
    })
  ];
}
