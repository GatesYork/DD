# Implementation and pilot runbook

## Milestone 1 — foundation and interactive prototype

Implemented: workspace, mobile/web simulation, admin simulation, shared validation/pricing, database schema/RLS, atomic booking RPCs, and automated checks. This milestone supports design feedback and backend development; it does not operate a ride service.

Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e:cloud`. App startup commands and limits are in the root README. Never enter real identity or payment information in the demos.

## Milestone 2 — real accounts and marketplace

Connect Supabase Auth and implement onboarding/profile creation, school verification adapters and staff review, approved vehicles, driver availability heartbeats, request/offer subscriptions, and RPC-backed booking screens. Replace demo repositories explicitly instead of silently mixing real and fictional records. Add end-to-end tests using two separately authenticated users. Validate Supabase RLS through the API as well as SQL.

## Milestone 3 — trips and payments

Resolve fee and cancellation policies. Confirm payment-provider support for the operating model. Integrate maps and foreground/background location, signed payment callbacks, payment reservation expiry, trip status transitions, capture/refund/transfer reconciliation, notifications, messaging, and support. Add booking-race and webhook retry tests. Validate iOS and Android permissions and lifecycle on actual devices.

## Milestone 4 — controlled launch

Before accepting paid rides, resolve applicable licensing, insurance, driver-screening operations, document retention, incident response, and staffed support. Confirm approved service boundaries and student verification domains with the school; the initial domain and 15 km boundary are development assumptions. Do not publish claims that student membership itself establishes safety.

Start with recruited drivers and a small student cohort. Track request-to-booking conversion, time to an accepted offer, cancellations, completed rides, repeat usage, off-app leakage, support incidents, and contribution margin after actual costs. Expand only when service quality and economics support it. The earlier national revenue spreadsheet was not provided or validated and is not a forecast.
