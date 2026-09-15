# Product decisions

## Assumptions

- The launch market is adults 18+ in one metro area; locations shown publicly are city-level only.
- Discovery is role-led. A candidate must need the current user's primary role, or fill a role the current user needs.
- Compatibility is intentionally explainable: genre 25%, role 20%, distance 15%, schedule 15%, commitment 15%, goals 10%.
- Distance, age, blocks, and role compatibility are hard gates. Other factors rank eligible profiles.
- A mutual like opens one canonical match and one conversation.
- “Available now” means open to a timely invitation, not live location sharing.
- Production discovery only shows authenticated member data from Supabase. A visibly labeled, isolated demo mode provides fictional interview data and never writes to the live backend.
- Retention is utility-led: Delos asks for the next commitment—introduction, session, readiness, or preparation—instead of adding a passive social feed.
- Premium prompts appear only where they explain a relevant benefit. Checkout remains one clear action, and webhook-confirmed server entitlements—not the success redirect—unlock features.
- Complete compatibility controls are free because they are the product promise. Amplified sells speed, visibility, privacy, media capacity, and up to three simultaneous recruiting searches.
- The north-star metric is confirmed compatible sessions per weekly active musician, not swipes or time spent.

## MVP boundaries

There is no feed, distribution, royalties, livestreaming, venue booking, machine-learning recommendation, production billing, or complex identity verification. Profile links are informational. Profile photos and performance media upload to private Supabase Storage.

Approximate device coordinates are rounded to two decimal places before private storage and are exposed only through a server-computed distance. Free accounts receive 15 likes per UTC day. Stripe-hosted Checkout powers test-mode web subscriptions; iOS and Android purchases stay disabled until native store products are configured. Stripe webhooks, rather than client redirects, are authoritative for entitlements.

## Recommended next features

1. Add signed media playback URLs and resumable uploads.
2. Add post-rehearsal private feedback, repeat-session scheduling, and collaborator reliability signals after sufficient safety research.
3. Add Band Room file attachments, song keys/tempos, and setlist ordering.
4. Add availability editing at morning/afternoon/evening granularity and better travel-time estimation.
5. Run matching-weight calibration interviews, then add transparent user controls before considering learned ranking.
6. Add RevenueCat or native store billing, restore purchases, entitlements, and regional pricing.
7. Add account export/deletion jobs, content retention policy, and formal trust-and-safety escalation.
8. Add annual and fixed-duration recruiting offers only after matching Stripe and native-store products are configured and price-tested.
