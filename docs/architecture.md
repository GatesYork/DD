# Architecture and database

The npm workspace contains Expo mobile and Next.js operations applications. Shared TypeScript packages implement validation and demo rules. The applications are currently local demonstrations. Supabase is the planned backend; database migrations are executable and tested independently of the demos.

## Data groups

| Group | Tables |
| --- | --- |
| Identity and eligibility | profiles, schools, student_verifications, driver_profiles, driver_checks, vehicles |
| Markets and availability | markets, school_markets, driver_sessions, driver_locations |
| Matching and trips | ride_requests, ride_offers, trips, trip_events |
| Money | payments, refunds, driver_transfers, payment_webhook_events |
| Community and support | ratings, favorite_drivers, trip_messages, reports, user_blocks, push_tokens |
| Operations | admin_roles, audit_logs |

UUID keys, UTC timestamps, integer cents, USD-only initial pricing, constrained statuses, and foreign keys protect data integrity. School membership is independent of visited market. Markets initially use a center and radius; polygon boundaries can replace this when launch geography requires it.

## Trusted booking operations

1. `create_ride_request`: requires current student verification, an active profile, valid passenger count, and both coordinates within an active market.
2. `available_ride_requests`: requires an eligible driver session and returns rounded coordinates only; excludes blocked pairings and the driver's own requests.
3. `submit_ride_offer`: locks the request, verifies driver/vehicle/check expiry and availability, calculates the fee on the server, and supports updating a pending quote.
4. `accept_ride_offer`: locks the request before the offer, verifies ownership, expiry, eligibility, and blocks again, snapshots the price into a trip, withdraws other offers, and records an event in one transaction.

Unique request and offer keys prevent multiple bookings. Partial unique indexes prevent a rider or driver holding multiple active trips in the same role. Cross-role simultaneous rider/driver activity needs a policy before production. All acceptance failures roll back the transaction. Accepted trips remain `awaiting_payment`; payment timeout cleanup and authenticated lifecycle operations are intentionally not exposed yet.

## Access boundaries

RLS is enabled on every application table. Authenticated clients can read their own records and participant trips. Precise pickup data is visible to the rider and the assigned driver after acceptance. Approximate discovery uses a narrowly scoped security-definer function. Financial records, approvals, trip states, staff roles, audit entries, and payment webhook events have no client mutation grants. Direct client writes are limited to the caller's favorites, blocks, and push registrations. Other writes will use validated backend functions.

The `private` schema contains eligibility helpers with no client execution rights. Public RPCs use explicit empty search paths, fully qualified object names, current caller identity, and explicit execution grants. Service-only location storage has no client policy until trip-scoped, expiring location access is implemented. Never expose a service-role key in either frontend.

## Remaining integration contracts

- Profile creation must derive identity from Auth; clients cannot self-approve student or driver eligibility.
- Verification providers supply references/status/expiry; avoid retaining identity documents or biometric data. Add private storage, retention policies, and signed access only if required.
- Payment handlers must verify webhook signatures, transactionally deduplicate provider event IDs, reconcile amount/currency/trip, and enforce lifecycle transitions. A unique webhook ID alone is not a complete idempotency implementation.
- Refund/transfer handlers must enforce cumulative monetary limits and recipient identity; schema constraints alone do not perform financial reconciliation.
- Staff actions require server-side roles and immutable audit entries. The current admin demo is never a staff security boundary.
- Reports, messages, and ratings need participant-aware write functions. Live location needs short retention and trip-scoped reads. No fake integration endpoints are supplied.

## Testing limits

Database tests run the actual migration against a PostgreSQL engine with a test Auth shim. They cover policies, grants, server pricing, expired eligibility, blocked pairings, and booking constraints. Add hosted/local Supabase integration and true multi-connection concurrency tests before connecting live bookings. Native builds, device permissions, background execution, and push delivery need physical-device testing.

## Cinematic web demo and pricing migration

The deployed web UI is `RideExperience.web.tsx`, which loads modular components from `features/cinematic`. The native `.tsx` screen remains the earlier, simpler prototype. Web motion uses CSS transforms/keyframes, pointer parallax, and system-reduced-motion detection. Audio is generated locally through Web Audio only after opt-in; it never reads hardware ringer state.

Migration `202610150002_per_person_commission.sql` preserves historical additive-fee records using `pricing_model = legacy_additive`. New submitted quotes use whole-dollar `per_person_cents`, server-multiplied booking totals, a deducted commission, and a generated driver earnings field. The accepted trip snapshots the pricing model and unit price. Older quotes are not reinterpreted or repriced.

The first-accept and priority-window experiences are local simulations. The existing database RPC acceptance boundary remains rider-authorized; production driver-accept matching, durable priority expiry, immutable rider-approved request prices, driver minima, and atomic eligibility matching still need backend implementation. Do not connect the web simulation directly to production bookings.

The SVG campus map is a stylized illustration, not cartographic or live data. Location markers mount only for confirmed/arriving/in-progress simulated trips and unmount on completion/cancellation. Real mapping, trip-scoped subscriptions, location permission handling, stale-location indicators, and server-side sharing termination remain required.

School logo URLs for UGA/GT/KSU use ESPN's public image CDN, with monogram fallbacks on failure. These URLs were blocked by the development environment's network policy, so successful external image delivery has not been validated here. Georgia College uses an explicitly provisional GC monogram until an official asset is supplied. Campus landmark art is original SVG illustration. No university affiliation is implied. Optional Google Fonts fall back to system fonts if unavailable.

## Full-screen liquid school themes

The web demo now uses an original WebGL fragment shader to blend each school's palette into moving marble-like veins across the whole viewport. Georgia College uses navy/blue/emerald/mint. Translucent dark panels keep booking controls readable above the color field; the map is also dark themed. School selection smoothly updates shader uniforms. This replaces the previous white backdrop and floating pastel circles.

The renderer caps backing resolution and runs at approximately 30 fps, suspends drawing in hidden tabs, and renders a static frame for reduced-motion or Motion off. Pointer movement gently displaces the texture. WebGL failures/context loss fall back to a CSS school-color background. Shader/program/buffer and event handlers are released on cleanup. Browser tests exercise active rendering, changing background pixels, frozen motion, and interaction through the non-interactive background layer. Physical-device GPU performance still needs validation.
