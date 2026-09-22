# Delos data inventory and retention

This document describes the product as implemented. It is an engineering record, not a substitute for jurisdiction-specific legal advice.

## What Delos collects

- **Account:** authentication ID, private email, email-verification state, account creation time, 18+ attestation, and account status.
- **Musician profile:** display name, age, city/area, biography, instruments, genres, influences, experience, goals, availability, travel radius, transportation, equipment, band membership, public music links, and availability status.
- **Private location:** optional coordinates rounded to two decimal places. They are used to calculate approximate distance and are not returned as a public profile field.
- **Media:** member-uploaded profile images and performance audio/video, MIME type, size, storage path, and upload time.
- **Activity:** likes, passes, matches, messages, read times, session proposals, Band Calls, applications, saved profiles, notifications, and limited product-funnel events.
- **Safety and support:** blocks, confidential reports, moderation actions, support tickets, and optional diagnostics consisting only of app version, build, platform, OS version, and device model.
- **Subscriptions:** tier, billing provider, provider customer identifier, entitlement expiry, and webhook event identifiers. Delos does not store full payment-card details.
- **Push notifications:** Expo push token, platform, enabled state, and update time.

## Visibility and sharing

- Signed-in members can see published musician-profile fields and authorized profile media. Exact coordinates and email addresses are not profile fields.
- Matches can see their shared conversation, messages, proposals, and Band Room items.
- Reports, blocks, support requests, diagnostics, moderation actions, subscription identifiers, and push tokens are not public.
- Authorized moderators/admins can access report and support queues. Development receives a support request only after explicit escalation.
- Supabase processes authentication, database, storage, realtime, and Edge Functions. RevenueCat/App Store billing and optional Sentry crash reporting process only the data required for those configured services.

## Retention and deletion

- Active-account records are retained while needed to provide Delos.
- Account deletion removes the Supabase Auth user; database records tied to that user are deleted through foreign-key cascades, and profile-media objects are removed by the deletion function.
- Stripe customer data and RevenueCat subscriber data are deleted when configured; a failure stops deletion so it can be retried rather than silently leaving an incomplete result.
- Payment, fraud-prevention, moderation, security, backup, and legal records may require limited retention under the applicable provider policy or law. Final production policy must define exact periods with counsel before public launch.
- Users can remove approximate coordinates separately, pause discovery, export their data, block members, and permanently delete their account in Settings.

## Data minimization rules

- Never request passwords, authentication codes, payment-card numbers, government IDs, or precise home addresses in support tickets.
- Do not copy message or media contents into diagnostics automatically.
- Use a ticket reference—not an email address—in internal escalation.
- Grant moderator/admin roles only through trusted server-side administration and review access regularly.
