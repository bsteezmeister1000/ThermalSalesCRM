# Implementation Notes

## Production database setup

- Set `DATABASE_URL` in your host environment to a managed PostgreSQL instance.
- For Neon or another hosted Postgres provider, use the full SSL-enabled connection string.
- Apply migrations in production with `npm run db:deploy`.
- Generate Prisma Client during build with `npm run db:generate` or rely on `postinstall`.

## Seeding demo data

- Demo/fixture ingestion is intentionally labeled as sample data.
- Seed with `npm run db:seed`.
- The seed path creates source records, ingests the Cedar Rapids fixture adapter, and writes sample workflow history.

## Adding live municipal permit sources

1. Start in `lib/domain/adapters`.
2. Prefer XLSX/CSV or public structured endpoints first.
3. Preserve raw payloads in `RawRecord`.
4. Normalize into `Permit`, `Property`, and `Organization` records through the ingestion service.
5. Create fixture tests before enabling automation.
6. Mark unstable or login-gated sources as manual/public-review until a durable workflow exists.

## Cedar Rapids radius permit list

- The app centers permit discovery on Cedar Rapids, IA using a 100-mile radius.
- Exact radius checks use `Property.latitude` and `Property.longitude` when present.
- If coordinates are missing, the permit list can still include records using documented city-centroid estimates.
- Estimated matches are labeled in the UI so sales users can distinguish them from exact-coordinate matches.
- Records without coordinates and without a supported city centroid are excluded from the in-radius list and counted as unknown coverage.

## Extending lead scoring

- Scoring config starts in `lib/domain/config.ts`.
- Scoring logic lives in `lib/domain/scoring/engine.ts`.
- Keep scores explainable and update the explanation reasons any time weights or rules change.
- If you add jurisdiction-specific rules, keep them config-driven rather than hardcoded into the UI.

## Workflow architecture

- The app is intentionally web-first.
- Scraping and sync jobs run server-side and write through Prisma.
- Lead workflow now includes explicit next-action fields on `Lead`, so queue views and detail pages can distinguish between recommendation and operator-owned follow-through.
- The PWA layer makes the app installable without changing the backend contract.
- A future Electron or Tauri wrapper should sit around the existing Next.js app rather than replacing the data pipeline.
