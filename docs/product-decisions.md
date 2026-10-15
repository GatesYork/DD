# Pilot product decisions

## Initial scope

Working name: Designated Driver (DD). Branding/trademark availability has not been researched. Start with Georgia College; distinguish a student's home school from the market they visit. Student verification is membership eligibility, not a safety guarantee. An account may be both rider and driver, but drivers require separate current approval, vehicle approval, and identity/license/insurance/screening checks.

The pilot has one booking per trip and 1–6 passengers depending on vehicle capacity. No unrelated passenger pooling or split payments. Drivers quote a total fare; riders choose an offer. Price is fixed at acceptance. Offers expire in five minutes, requests in ten minutes. Fresh driver availability expires after two minutes without heartbeat. Live heartbeat and reservation cleanup workers remain to implement.

## Pricing assumption to test

The prototype adds a configurable 15% platform fee to the driver's quote, rounded to the nearest cent. A $7.50 driver fare produces a $1.13 fee and an $8.63 rider total. This is a provisional rider-fee model, distinct from taking 15% out of the driver's stated fare. The original discussion considered a commission; choose the final model before payment integration. Processing costs, insurance, refunds, taxes, and payout costs are not modeled as profit or guaranteed driver earnings.

The mobile simulation and SQL use the same pricing convention. SQL reads the fee rate from the market and clients cannot write financial fields. The simulation has a fixed default rate solely for the demo.

## Demo limitations

All named people, ratings, availability, arrival estimates, trips, and review results are fictional. Route graphics are illustrations, not calculated maps. Switching Ride/Drive lets one tester explore both sides of the same in-memory request. Browser refresh resets state; favorites persist only across simulated rides in that session. The admin demo has its own independent fixtures. There is no login or claim of live backend connectivity.

The simulated trip bypasses payment deliberately and visibly. The real database accepts an offer into `awaiting_payment` and never pretends funds have been authorized. Demo cancellation has no fee; production cancellation/no-show rules need a product decision before integration.

## Later scope

Authentication and account recovery; provider-backed verification; driver onboarding; real routing and background location; transactional payments, refunds, and payouts; staff authentication; reporting and support workflows; notifications and messaging; then additional campus markets. Scheduled rides, pooled bookings, events, subscriptions, and sponsorships follow pilot evidence.

## Updated decisions — cinematic demo

These decisions supersede the earlier additive-fee and total-quote assumptions above:

- Bright, animated school themes: Georgia College, UGA, Georgia Tech, and Kennesaw State. Theme selection persists in the browser. School/market switching is disabled during a request. These are preview campuses, not operating service areas.
- Whole-dollar per-person rates with no group discount. Example: $5 × 3 people = $15. The 15% platform commission is deducted from that $15, leaving $12.75 before any other applicable deductions. No added rider platform fee.
- Driver pricing preferences are private minimum trip earnings; drivers must explicitly go online. Demo peers are fictional online profiles. Driver-supplied fractional amounts are rejected. Distance-dependent demo prices use three preset illustrative routes ($4/$5/$6 per person), not real routing or addresses.
- The first eligible simulated driver accepts a public request. A selected active profile has a 120-second priority window, with early release available. A preferred-driver acceptance button is explicitly a simulation. Driver profile visibility is not a public price competition.
- Booking students may bring non-student guests. Separate verified-student guest booking remains a future flow.
- Request, pickup, and drop-off location markers exist only during a matched, active simulated trip; they are removed on cancellation/completion. There is no GPS collection, location permission request, or off-trip tracking.
- Browser sound is opt-in and off by default each visit. Browsers cannot reliably detect the hardware silent switch. Native ringer-aware audio is not implemented. Motion respects system reduced-motion preferences and an in-app toggle.

The previous native screen remains a simpler prototype with updated pricing. The cinematic interface targets the deployed Expo web demo. Native animation parity and real realtime location require a later implementation.
