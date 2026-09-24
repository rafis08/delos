# Delos App Store submission readiness

## Current decision: NOT READY TO SUBMIT

The codebase passes its automated tests, type checking, linting, Expo diagnostics, and web export. Do not send the app to Apple until every **BLOCKER** below is resolved.

- **BLOCKER — Public website:** make `https://delosmusic.app` public and connect the domain. Every legal and support URL below must load without signing in.
- **Legal contact configured:** `support@delosmusic.app` is the monitored contact across the legal package. AIFIXMY LLC is identified as based in Livingston, New Jersey, United States.
- **BLOCKER — Production backend:** apply all production migrations, deploy required Edge Functions, configure authentication URLs, private storage, Realtime, push notifications, and moderation access.
- **BLOCKER — Subscription:** create the App Store subscription, connect RevenueCat, and pass sandbox purchase, restore, expiry, cancellation, and entitlement tests.
- **BLOCKER — Review access:** create a stable production reviewer account with populated data. Do not require a one-time code, invitation, or expired link.
- **BLOCKER — Signed build:** produce a production iOS build and verify that its build environment uses Xcode 26 or later with the iOS 26 SDK or later.
- **BLOCKER — Device QA:** complete the release test matrix on physical iPhones, including a clean install, permission denial, poor network, account deletion, report/block, media upload, notifications, and purchases.
- **BLOCKER — Store assets:** capture final screenshots from the submitted build and complete privacy, age rating, content-rights, encryption, accessibility, and availability answers in App Store Connect.

Recommended first release posture: iPhone only, United States storefront first, manual release after approval, and disable automatic Apple silicon Mac and Apple Vision Pro availability until those environments have been tested.

## Product metadata

- **Name:** Delos
- **Subtitle:** Where music is born
- **Primary category:** Music
- **Secondary category:** Social Networking
- **Age:** Adults 18+. Answer Apple's current questionnaire truthfully for user-generated content, messaging, mature themes, and real-world meetups, then select the higher 18+ rating where App Store Connect permits an override.
- **iOS Bundle ID:** `com.delos-music.app` (confirm availability and ownership before the first build; it cannot be changed after upload)
- **Android package:** `com.delosmusic.app`

### Promotional text

Find musicians who fit your sound—and your real life.

### Description

Delos helps musicians turn compatible profiles into real rehearsals. Discover nearby singers, players, producers, and active projects based on instruments, genres, influences, distance, availability, skill, goals, and level of commitment.

Every recommendation includes an explainable compatibility score. Connect when the fit feels right, message mutual matches, propose a rehearsal or audition with a three-song set, and organize the work in a shared Band Room.

Built for adults who want to make music with intention—not collect followers.

Key features:

- Practical, explainable musician compatibility
- Performance photos, audio, and video
- Mutual connections and private messaging
- Band Calls for active projects and missing roles
- Rehearsal and audition proposals
- Shared setlists, tasks, and notes
- Blocking, reporting, privacy, and account deletion controls

Delos: where music is born.

### Keywords

`musicians,bandmates,band,drummer,guitarist,singer,rehearsal,audition,music,collaboration`

## Review notes

Delos is an adults-only musician collaboration service. It does not provide anonymous or random chat: messaging is available only after mutual connection or an accepted Band Call introduction. Every member profile exposes report and block controls. Account deletion is available in Settings and removes the authentication account and associated user data.

The **Explore the demo** button on the welcome screen provides a populated fictional walkthrough without credentials. Demo mode is visibly labeled and does not write to the production backend. Provide App Review with a separate verified production review account as well so reviewers can test realtime messaging, media, account deletion, and the submitted App Store subscription.

Amplified is a digital subscription and uses Apple in-app purchase on iOS. The first subscription and app version must be submitted together. Stripe Checkout is used only on the separate web build and is never linked or promoted from the iOS purchase flow.

## App privacy answers

Confirm these against the release configuration in App Store Connect:

- **Contact Info — Email Address:** collected, linked to identity, app functionality/account management; never public.
- **Location — Coarse Location:** collected, linked to identity, app functionality; public display is city-level only.
- **User Content — Photos or Videos:** collected, linked to identity, app functionality.
- **User Content — Audio Data:** collected, linked to identity, app functionality.
- **User Content — Other User Content:** biography, messages, Band Calls, session proposals, reports, and shared-room content; collected and linked for app functionality and safety.
- **Identifiers — User ID:** collected, linked to identity, app functionality.
- **Purchases — Purchase History:** collected, linked to identity, app functionality.
- **Usage Data — Product Interaction:** collected, linked to identity, analytics and product functionality.
- **Diagnostics — Crash Data:** declare only when a Sentry DSN is enabled in the submitted build.
- **Tracking:** No. Delos does not currently use cross-company advertising tracking or IDFA.

## Required URLs and contact

Before submission, publish HTTPS pages for:

- Privacy Policy: `https://delosmusic.app/privacy`
- Terms of Use: `https://delosmusic.app/terms`
- Community Guidelines: `https://delosmusic.app/community`
- Support: `https://delosmusic.app/support`
- Privacy choices/account deletion: `https://delosmusic.app/privacy-choices`

The monitored legal contact is `support@delosmusic.app`. AIFIXMY LLC is identified as based in Livingston, New Jersey, United States. Verify the effective dates, retention practices, subprocessors, governing law, and applicable privacy rights. The in-app Legal screen must match these published pages.

## Screenshots and product page

Upload 6–8 portrait screenshots from the final production-like build. Apple accepts 1–10 screenshots; the largest required iPhone size can be used for automatic scaling. Capture at an accepted 6.9-inch resolution such as 1320×2868, without transparency.

Suggested sequence:

1. Welcome — “Sound is only half the match.”
2. Discovery — explainable musician compatibility
3. Profile — instruments, influences, schedule, and media
4. Band Calls — find the missing member
5. Mutual messaging — plan the first rehearsal
6. Rehearsal proposal — move from chat to action
7. Band Room — setlists, tasks, and notes
8. Safety — block, report, privacy, and account controls

Do not show unfinished UI, debug labels, personal data, placeholder content, Android chrome, or features unavailable in the submitted build. App previews are optional; skip video for version 1 unless a polished capture is ready.

## Age rating, privacy, and accessibility

- Complete every current age-rating question; do not reuse answers from an older questionnaire.
- Declare user-generated content and unrestricted user-to-user communication accurately. Confirm whether any mature music-related content is present before answering frequency questions.
- Use the privacy answers below only after comparing them with the exact production SDK configuration and data flows.
- If Sentry is enabled, disclose crash and diagnostic data and confirm its linkage/use. If it remains disabled, do not declare data that is never collected.
- Do not claim accessibility features in the Accessibility Nutrition Label until they have been tested throughout the core journey. At minimum, test VoiceOver, Dynamic Type/text resizing, sufficient contrast, reduced motion, and non-color-only status cues.
- Delos states it does not track users across other companies' apps or sites. Revisit this answer if advertising, attribution, or tracking SDKs are added.

## Native subscription setup

1. Create the app in App Store Connect with the final bundle ID.
2. Accept Apple's Paid Applications agreement and complete banking/tax setup.
3. Create one subscription group named **Delos Amplified**.
4. Create monthly product ID `delos_amplified_monthly` at the chosen storefront price.
5. Create a RevenueCat project, entitlement `amplified`, offering `default`, and attach the monthly App Store product as the monthly package.
6. Put the RevenueCat **public iOS SDK key** in the EAS environment as `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`.
7. Put the RevenueCat **secret API key** in Supabase Edge Function secrets as `REVENUECAT_SECRET_KEY`.
8. Generate a random webhook authorization value and store it in Supabase as `REVENUECAT_WEBHOOK_SECRET`.
9. Deploy `sync-revenuecat-entitlement` with JWT verification enabled and `revenuecat-webhook` with JWT verification disabled.
10. Configure the RevenueCat webhook URL as `https://pfaotpeebrhmwmhadymw.supabase.co/functions/v1/revenuecat-webhook` with `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`.
11. Test purchase, restore, expiration, cancellation, and cross-platform entitlement behavior with sandbox accounts.

### Subscription metadata

- **Group reference name:** Delos Amplified
- **Product ID:** `delos_amplified_monthly`
- **Reference name:** Delos Amplified Monthly
- **Display name:** Delos Amplified
- **Description:** More tools to find your band faster.
- **Duration:** 1 month
- **Review screenshot:** final paywall showing price, billing period, restore control, and Terms/Privacy links
- **Review note:** “Delos Amplified is available from Settings and contextual upgrade prompts. On iOS it is sold only through Apple In-App Purchase. Use the supplied review account, open Settings → Delos Amplified, purchase the monthly product, then verify Restore Purchases.”

For the first subscription, add the subscription to the same App Review submission as version 1.0. The subscription must be in the Ready to Submit state, with localization, price, review screenshot, and review notes complete.

## App Review information

Before submission, enter:

- A monitored contact name, phone number, and email.
- A non-expiring reviewer username and password in App Store Connect—not in this repository.
- Notes describing demo mode and the production account, plus exact navigation to messaging, report/block, account deletion, subscription purchase, and restore.
- Any test data or second account needed to exercise mutual messaging. If two accounts are required, supply both securely in Review Notes.
- A statement that location is approximate/city-level and why location permission is requested.
- A statement that account deletion begins in Settings and removes associated user-generated content; warn subscribed users that deleting the Delos account does not cancel their Apple subscription.

Never submit a reviewer flow that depends on a developer manually approving an account during review.

## Final release sequence

1. Confirm the published legal pages and monitored support mailbox.
2. Configure the production Supabase, push, moderation, RevenueCat, and StoreKit environments.
3. Create the App Store Connect app record and subscription; finish agreements, tax, and banking.
4. Run the physical-device QA matrix and accessibility pass.
5. Create the signed production build and upload it to TestFlight.
6. Run external TestFlight acceptance testing, including account deletion and StoreKit sandbox cases.
7. Capture screenshots from that release candidate and complete all App Store Connect metadata.
8. Attach the first subscription to the app-version submission.
9. Recheck every URL from a signed-out browser and every reviewer credential from a clean install.
10. Submit for review with manual release selected; release only after a final production smoke test.

## Build and upload

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production
```

EAS Submit uploads the binary to App Store Connect; it does not complete screenshots, metadata, privacy answers, subscription review information, export compliance, age rating, review credentials, or the final Submit for Review action.
