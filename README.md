# Designated Driver

A college ride marketplace: students request rides, drivers quote their own fares, and riders choose an offer. The initial market is Georgia College in Milledgeville.

## Latest web demo

The web experience now has bright school themes, animated campus art and route lines, pointer parallax, button and panel transitions, reduced-motion support, and opt-in browser sounds. Choose a campus from the header. School logos fall back to monograms when unavailable; Georgia College uses a provisional GC badge.

Pricing is now whole-dollar **per person**, with a **15% commission deducted from the driver**. Route prices and distances are preset demo examples. Try browsing drivers for a two-minute preferred-driver window, or request a ride for automatic simulated matching. The driver view includes an explicit online switch and private whole-dollar minimum earnings.

The illustrated map shows simulated person markers only between matching and the end of a trip. It is not real GPS. Browser sound does not know the phone silent-switch setting; native audio and motion parity remain future work.

## What works now

- Expo mobile application with a responsive web build and a clearly labeled, in-memory demo: request a ride, compare offers, set a driver fare, book, simulate arrival and completion, cancel, rate, and favorite a driver.
- Next.js operations demo: fictional driver reviews, trip filtering, and support resolution. It is independent of the mobile demo.
- PostgreSQL schema with row-level security and authenticated RPCs for requests, approximate discovery, offers, and atomic acceptance. Accepted database trips wait for payment authorization.
- Shared validation and pricing rules; database, domain, and browser workflow tests.

**This is a development prototype, not a live ride service.** Apps are not connected to the database yet. Accounts, real student/driver checks, maps/GPS, payments, messaging, notifications, authenticated staff operations, and production trip transitions are upcoming integrations. Demo records reset on refresh. Native device behavior has not yet been validated.

## Development

Use Node.js 22.13+ and npm. From the existing checkout:

```sh
cd /workspace/DD
npm ci
npm run dev:mobile
```

In a second terminal, run `npm run dev:admin` from the repository root. Mobile web uses port 8081; operations uses port 3000. To open Expo's device development workflow, run `npx expo start` in `apps/mobile`. Native testing requires a compatible Expo Go or development build and a device/emulator.

No external credentials are required for these demos. `.env.example` documents future public connection settings; adding values does not connect the demos automatically.

## Checks

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e:cloud
```

The cloud browser command uses a bundled Linux Chromium installed through npm, avoiding a separate browser-download domain. On other systems, use `npx playwright install chromium` and `npm run test:e2e`. Playwright starts both apps and checks the complete simulated ride, pricing, passenger capacity, favorites, cancellation, and admin actions.

Database tests use PGlite (PostgreSQL in WebAssembly), execute the actual migrations, and emulate only the Supabase `auth.users`/`auth.uid()` boundary. They verify authorization and database constraints, not hosted Auth, Realtime, PostgREST, or independent concurrent database connections. The SQL request locks and unique active-trip indexes provide the production concurrency controls; a multi-connection integration test is still required before live bookings.

## Local Supabase (next integration milestone)

The migration, seed, and CLI configuration are in `supabase/`. With Docker and an installed Supabase CLI, `supabase start` starts the local stack; use `supabase migration up --local` to apply pending migrations to an existing local instance. Do not run reset commands on a database containing work to preserve. The seed creates a fictional pilot configuration, not student accounts. Full Supabase startup is not required for the current demos and has not been validated here.

## Structure and decisions

- `apps/mobile`: Expo Router and React Native experience.
- `apps/admin`: Next.js operations prototype.
- `packages/domain` and `packages/validation`: simulation, pricing, and input validation.
- `supabase/migrations`: schema and trusted database operations.
- `supabase/tests`, `tests/e2e`: database and browser behavior checks.
- `docs/product-decisions.md`: pilot scope and assumptions.
- `docs/architecture.md`: access boundaries and data model.
- `docs/pilot-runbook.md`: remaining implementation and rollout steps.
- `docs/dependency-review.md`: unresolved upstream dependency advisories and release follow-up.

Use the existing checkout in cloud tasks. Each task is already isolated; do not create a Git worktree unless explicitly requested.
