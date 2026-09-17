# Delos App Store submission

## Product metadata

- **Name:** Delos
- **Subtitle:** Where music is born
- **Primary category:** Music
- **Secondary category:** Social Networking
- **Age:** Adults 18+. Complete Apple's questionnaire accurately and override upward to 18+ because profiles, messaging, user media, and real-world meetups are central to the product.
- **Bundle ID:** `com.delos.app` (confirm availability and ownership before the first build; it cannot be changed after upload)

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

Replace every beta placeholder in `PRIVACY.md`, `TERMS.md`, and `SUPPORT.md` with the operator's legal name, public support email, effective date, retention practices, subprocessors, governing law, and applicable privacy rights. The in-app Legal screen must match the published policy.

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

## Build and upload

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production
```

EAS Submit uploads the binary to App Store Connect; it does not complete screenshots, metadata, privacy answers, subscription review information, export compliance, age rating, review credentials, or the final Submit for Review action.
