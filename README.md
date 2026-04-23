# Thermal Lead Tracker

Thermal Lead Tracker is a production-minded MVP for insulation contractors working the Cedar Rapids, Iowa market. It ingests public permit-oriented data, preserves raw provenance, normalizes likely opportunities into a reviewable CRM workflow, and scores those opportunities with explainable heuristics.

## Architecture summary

- `Next.js App Router + TypeScript + Tailwind`: server-rendered operational UI for dashboard, lead queue, lead detail, organizations, sources/health, imports, and scoring settings.
- `PostgreSQL + Prisma`: normalized entities for sources, raw records, permits, permit snapshots, properties, organizations, leads, review flags, activities, change logs, sync job runs, and digests.
- `Server-side ingestion + sync jobs`: each jurisdiction/source gets an isolated adapter implementing `fetchIndex`, optional `fetchDetail`, `parse`, and `healthcheck`, with sync runs recorded in the database.
- `Explainable scoring`: the scoring engine returns both category scores and human-readable reasons.
- `Review-first data flow`: raw source records remain distinct from normalized lead data; manual-review sources are explicitly marked instead of scraped evasively.
- `Installable PWA`: the MVP is intentionally a web app first, with a manifest, service worker, and install prompt instead of Electron or Tauri.

## Delivery stance

This MVP is intentionally optimized around the data pipeline, dedupe logic, scoring engine, and CRM workflow before native desktop packaging.

- Web-first delivery keeps the core system maintainable and deployable with standard Next.js infrastructure.
- PostgreSQL and Prisma remain the system of record, so data integrity is not tied to a local desktop runtime.
- Scraping and sync jobs run server-side, which keeps browser clients lightweight and keeps automation concerns out of the UI shell.
- The app is structured so a desktop wrapper can be added later around the same routes, APIs, and Prisma-backed backend without rewriting the product core.

## Database foundation

The database layer is designed as a real operational baseline, not a scratchpad:

- `Source` tracks adapter identity, enablement, automation mode, run cadence, and health.
- `RawRecord` preserves fetched source payloads separately from normalized app entities.
- `Permit` is the current normalized representation used by the app.
- `PermitSnapshot` preserves normalized historical observations so permit changes do not erase prior state.
- `Property`, `Organization`, and `PersonContact` hold enrichment data with confidence and provenance support.
- `Lead` models the CRM workflow state for a permit-driven opportunity.
- `LeadOrganizationLink` captures builder / GC / owner / applicant relationships cleanly.
- `LeadActivity` records user and system activity over time.
- `ChangeLog` stores structured field-level change history.
- `SyncJobRun` logs ingestion/sync execution for ops and diagnostics.

Prisma access patterns:

- The singleton Prisma Client lives in [lib/prisma.ts](/Users/bentonjackson/Documents/Thermal%20Sales%20CRM%20/lib/prisma.ts).
- [lib/db/prisma.ts](/Users/bentonjackson/Documents/Thermal%20Sales%20CRM%20/lib/db/prisma.ts) re-exports that singleton for backward compatibility.
- Repository-style helpers live under [lib/repositories](/Users/bentonjackson/Documents/Thermal%20Sales%20CRM%20/lib/repositories).
- Domain queries/services call Prisma through that shared client rather than scattering raw SQL.

## Schema summary

Core entities in `prisma/schema.prisma`:

- `Source`: adapter metadata, run cadence, health, and enablement.
- `RawRecord`: immutable-ish raw payload lineage with dedupe hashes and parse status.
- `Permit`: normalized permit layer with source confidence and provenance.
- `PermitSnapshot`: historical normalized permit snapshots linked back to raw records when available.
- `Organization`, `PersonContact`, `Property`: enrichment context.
- `Lead`, `LeadOrganizationLink`, `LeadActivity`, `ReviewFlag`: CRM/review workflow.
- `ChangeLog`: historical field-level mutations.
- `SyncJobRun`, `Digest`: scheduling and notification-ready outputs.

## What is live now

- Phase A foundation is implemented:
- Next.js app scaffold and App Router pages.
- Prisma schema and initial migration folder.
- Cedar Rapids monthly permit report adapter using fixture-backed sample records.
- Manual/public-review placeholders for Linn County, Marion, Iowa City, and Coralville.
- Lead queue, lead detail, organizations, sources/health, imports, and scoring settings pages.
- Scoring engine v1 with visible reasons.
- Seed flow that creates sources, ingests Cedar Rapids sample permits, and writes job/digest/changelog data.
- Unit, integration, fixture, and baseline E2E tests.

## What remains manual right now

- Live municipal portal automation for Linn County, Marion, Iowa City, and Coralville is intentionally marked partial/manual until public endpoints or stable exports are verified.
- Contact enrichment is limited to public-business-contact placeholders and manual entry patterns.
- Duplicate merge UI, settings mutations, digest delivery, and geographic map clustering are not yet fully interactive.
- Real production scheduling still needs deployment-specific cron wiring.

## Setup

1. Install dependencies with your preferred package manager once available in the environment:
   `npm install` or `pnpm install`
2. Copy env vars:
   `cp .env.example .env`
3. Set `DATABASE_URL` to your PostgreSQL connection string.
   Prisma reads it directly from `env("DATABASE_URL")` in [prisma/schema.prisma](/Users/bentonjackson/Documents/Thermal%20Sales%20CRM%20/prisma/schema.prisma).
4. Generate Prisma Client:
   `npm run db:generate`
5. Apply the initial migration in development:
   `npm run db:migrate`
6. Apply migrations in production:
   `npm run db:deploy`
7. Seed demo/sample data:
   `npm run db:seed`
8. Run the app:
   `npx next dev`
9. Run tests:
   `npx vitest run`
   `npx playwright test`

The initial migration lives at [prisma/migrations/20260423150000_init/migration.sql](/Users/bentonjackson/Documents/Thermal%20Sales%20CRM%20/prisma/migrations/20260423150000_init/migration.sql).
It creates the full relational baseline, not just placeholder enums.
If Prisma CLI is temporarily unavailable in a constrained environment, [scripts/apply_manual_prisma_migration.py](/Users/bentonjackson/Documents/Thermal%20Sales%20CRM%20/scripts/apply_manual_prisma_migration.py) can apply the checked-in SQL migration and record it in `_prisma_migrations`.

## PWA notes

- The web manifest is defined in [app/manifest.ts](/Users/bentonjackson/Documents/Thermal%20Sales%20CRM%20/app/manifest.ts).
- Service worker registration lives in [components/layout/service-worker-registration.tsx](/Users/bentonjackson/Documents/Thermal%20Sales%20CRM%20/components/layout/service-worker-registration.tsx) and the service worker itself is [public/sw.js](/Users/bentonjackson/Documents/Thermal%20Sales%20CRM%20/public/sw.js).
- The install affordance is [components/layout/pwa-install-prompt.tsx](/Users/bentonjackson/Documents/Thermal%20Sales%20CRM%20/components/layout/pwa-install-prompt.tsx).
- PWA icons are generated into `public/` by [scripts/generate_pwa_icons.py](/Users/bentonjackson/Documents/Thermal%20Sales%20CRM%20/scripts/generate_pwa_icons.py).
- This keeps the MVP desktop-like for operators while avoiding native wrapper complexity in version one.

## Source adapter architecture

Adapters live under `lib/domain/adapters`.

- `base.ts`: shared `SourceAdapter` interface.
- `monthly-report-adapter.ts`: downloadable report pattern with row lineage preservation.
- `manual-review-adapter.ts`: explicit safe fallback for unstable/login-gated sources.
- `registry.ts`: active adapter registration.
- `fixtures/`: regression fixtures for parser safety.

To add a new city adapter:

1. Create a new adapter class implementing the `SourceAdapter` interface.
2. Prefer XLSX/CSV or public structured endpoints before HTML scraping.
3. Add fixture files and parse tests before enabling automation.
4. Register the adapter in `registry.ts`.
5. Add source notes explaining whether the adapter is automated, partial manual, or manual review.
6. Seed or create the `Source` record so health and job logs are visible in the UI.

## Database notes

- `normalizedKey` on `Permit` is the primary dedupe boundary for normalized permit records.
- `RawRecord` keeps a source-specific key plus `canonicalHash`, so the same upstream record can be tracked across revisions.
- `PermitSnapshot` and `ChangeLog` together preserve both normalized history and structured field deltas.
- `Lead.permitId` is unique to avoid accidental duplicate leads for the same permit.
- `lib/repositories/source-repository.ts`, `lib/repositories/lead-repository.ts`, and `lib/repositories/sync-job-run-repository.ts` are starter access-layer modules you can extend as the app grows.

## Manual review notes

- Never assume parsed PDF rows are perfect; use low-confidence flags where row extraction is uncertain.
- Every lead should preserve provenance and review flags before it is treated as qualified.
- Manual/public-review sources should support import or saved-link workflows instead of brittle scraping.

## Next highest-leverage improvements

- Replace fixture-backed Cedar Rapids ingestion with a live XLSX/CSV fetch once a stable public report URL is confirmed.
- Add real adapter implementations for Linn County, Marion, Iowa City, and Coralville with fixture-based regression tests.
- Implement merge/suppress workflows for duplicates and bad-fit patterns.
- Add mutation routes for status transitions, notes, and source enable/disable controls.
- Add daily digest delivery and source-failure alerts.
