# Delos

Delos is a mobile-first musician discovery and band-formation MVP for iOS, Android, and web. It matches people on practical compatibility—not just taste—including roles, distance, schedule, commitment, and goals.

## Run it now

Requirements: Node 20+ and npm.

```bash
npm install
npm start
```

Press `i`, `a`, or `w` in Expo to open iOS, Android, or web. Create an account for the live Supabase experience, or choose **Explore the demo** for an isolated on-device walkthrough with clearly labeled fictional data. Demo actions never write to Supabase.

Useful checks:

```bash
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build:web
```

## Supabase setup

1. Create a Supabase project.
2. Apply every file in `supabase/migrations/` in filename order with the Supabase CLI or SQL editor. Existing projects must also apply migrations `003` through `006` to enable beta safety, Band Calls, applications, readiness, Band Rooms, and targeted opportunity alerts.
3. Apply `supabase/seed.sql` for instrument and genre taxonomy values (not user profiles).
4. Copy `.env.example` to `.env.local` and add only the public project URL and anonymous key.
5. Add `delos://auth/update-password` and your web origin to Authentication → URL Configuration.
6. Enable Realtime for the `messages` table.
7. Deploy `supabase/functions/push-notifications`, set a `WEBHOOK_SECRET`, and connect an authenticated Database Webhook on notification inserts. Service-role credentials belong only in the Edge Function environment.
8. Assign moderation access only through the SQL editor or a trusted server (`update public.users set role='moderator' where id='<trusted-user-uuid>';`). The moderation UI lives at `/moderation` and its RPC returns data only to moderator/admin accounts.
9. Deploy the authenticated `export-account-data` Edge Function alongside `delete-account`. Apply migration `019` for support tickets, moderation auditing, account sanctions, and adult attestation.
9. Optionally set `EXPO_PUBLIC_SENTRY_DSN` for crash reporting; Delos disables Sentry and sends no telemetry when it is blank.

### Stripe web subscriptions

Delos uses Stripe only for web checkout. iOS and Android premium purchases remain behind the native-store billing adapter so digital subscriptions comply with App Store rules.

1. Apply `202609140007_stripe_billing.sql`.
2. In Supabase Edge Function Secrets—not Expo variables or database rows—set:
   - `STRIPE_SECRET_KEY` to a restricted Stripe test key when possible.
   - `STRIPE_PRICE_AMPLIFIED_MONTHLY=price_1UFd0l01Up5V3AGf7L5rRrHC` for the Delos sandbox account.
   - `DELOS_WEB_URL=https://delosmusic.app`.
3. Deploy `create-checkout-session`, `create-customer-portal`, and `stripe-webhook`.
4. Create a Stripe webhook endpoint for the deployed `stripe-webhook` function and subscribe to `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
5. Store that endpoint's signing secret as `STRIPE_WEBHOOK_SECRET` in Edge Function Secrets.
6. Enable the Stripe Customer Portal in the sandbox Dashboard.

The publishable key is not required by this hosted Checkout implementation. Never add `STRIPE_SECRET_KEY`, restricted keys, or webhook secrets to `.env.local` or any `EXPO_PUBLIC_` variable. The sandbox product is $9.99/month and does not make live charges. Create a separate live Product and Price before launch; never reuse test identifiers in production.

Amplified is surfaced contextually from discovery, the daily-like meter, incoming likes, rewind, recruiting limits, media limits, profile controls, and privacy settings. Core compatibility filters remain free. Paid entitlements unlock unlimited likes, “Liked You,” rewind, incognito discovery, ten media slots, a weekly 24-hour profile boost, and three simultaneous Band Calls. Supabase RPCs and database triggers enforce sensitive limits server-side; the client never grants itself premium access.

Migration `009` adds privacy-conscious funnel events, private post-session confirmation, and active Band Call entitlements. See `GROWTH_PLAYBOOK.md` for the non-software launch, marketplace-density, moderation, pricing-test, and expansion plan.

Never place a service-role key in Expo client variables. The schema enables row-level security, member-only profile visibility, participant-only conversations/messages, private media storage, transactional mutual matching, and server-side message rate limiting.

## Architecture

- `app/` — Expo Router screens and navigation
- `src/components/` — reusable accessible design-system components
- `src/domain/` — pure scoring, matching, authorization, and validation logic
- `src/data/repository.ts` — replaceable data-access interface and Supabase implementation
- `src/data/demoRepository.ts` — isolated, on-device product-demo implementation
- `src/data/demoData.ts` — 20 fictional demo musicians and sample activity
- `src/store/` — session and app state
- `supabase/` — Postgres schema, indexes, storage policy, functions, and RLS
- `tests/` — scoring, match creation, authorization, and validation tests

The app uses no scraped photography or third-party musician likenesses. Profile visuals are generated in-app from initials, geometric forms, and solid color artwork.

## Realtime and production connection

The Supabase repository includes a Realtime `messages` subscription and maps database rows into the app domain model. With the migrations applied, all member, match, message, proposal, notification, report, block, and media data is stored in Supabase.

Private-beta features include signed private-media URLs, media removal, persisted discovery preferences, approximate coordinates rounded before storage, server-computed distance, 50-message pagination, read receipts, proposal responses, calendar export, push-device registration, a push Edge Function, blocked-member management, a moderation queue, and a 15-like daily free-tier limit. Subscription entitlements come from `subscription_status`; production purchases remain disabled until App Store billing is connected.

Support and safety include in-app FAQ and ticket history, optional privacy-minimized device diagnostics, a Support → Development escalation state, report/block flows, audited moderator suspensions and bans, 18+ attestation plus server-side age validation, approximate-location removal, authenticated data export, and permanent account deletion. See `DATA_PRIVACY.md` and `SUPPORT_RUNBOOK.md`.

Delos also includes **Band Calls**, a project-first opportunity board where musicians describe what they are building and which roles they need. Musicians can send an introduction; call owners can invite them into a real match and conversation. Matching Band Calls create targeted alerts instead of generic engagement notifications.

After matching, conversations deliberately point toward action: first-message prompts, rehearsal proposals, two-person readiness confirmation, calendar export, and a shared **Band Room** for setlists, preparation tasks, and musical notes. Profile completion is calculated from real profile data and always suggests one useful next step. The shortlist, native profile sharing, and explainable six-factor chemistry view support musicians who are not ready to decide immediately. All flows are populated in demo mode and backed by Supabase in production.

Billing uses the native-store adapter on iOS. Complete the RevenueCat and App Store Connect setup in `APP_STORE_SUBMISSION.md` before enabling production purchases.

## Deployment

The Expo project is already linked to EAS. Use `npm run build:preview` for internal device testing, `npm run build:production` for signed store builds, and `npm run build:web` for web. Resolve every item marked **BLOCKER** in `APP_STORE_SUBMISSION.md` before submission.

The Expo project is linked at `@rafis08/delos`. Follow `APP_STORE_SUBMISSION.md` for Apple metadata, privacy disclosures, review notes, RevenueCat/StoreKit configuration, and the remaining release gates.
