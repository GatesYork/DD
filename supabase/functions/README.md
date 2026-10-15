# Trusted integration boundary

The first milestone implements booking operations as PostgreSQL RPCs, which keep locking, authorization, and price snapshots in one transaction. No placeholder payment or verification endpoint is deployed.

Next integration functions: authenticated profile onboarding; verified provider callbacks for student/driver checks; driver session heartbeat; payment authorization and capture; signature-verified Stripe webhooks with transactional event deduplication; trip transitions and cancellations; reporting and messaging. Service credentials must stay in the backend.

`accept_ride_offer` reserves a trip in `awaiting_payment`. Only a future verified payment handler may confirm it. Reservation timeout cleanup must be implemented before live use; the initial schema intentionally does not pretend payment has succeeded. Admin role assignment and financial actions are service-only. The demo apps currently use fictional local state, not these RPCs.
