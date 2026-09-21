# Delos security hardening

## Implemented controls

- All user-owned tables use Row Level Security. The latest migration removes direct writes to likes, passes, messages, proposals, and reports so callers must use validating, authorization-aware RPCs.
- A user can no longer update `public.users`, preventing self-promotion to moderator or administrator.
- Blocking now denies conversation, message, proposal, and Band Room reads at the database layer, even when a caller already knows an object UUID.
- Profile media remains in a private bucket. Read access requires ownership or a registered media row attached to a visible, unblocked profile. Upload paths must begin with the authenticated user ID and media type/size limits are enforced by storage policy.
- Profile verification and boost timestamps are server-managed and cannot be changed through ordinary authenticated updates.
- Service-role, Stripe, RevenueCat, and webhook secrets are read only inside Supabase Edge Functions. The Expo client uses only the public Supabase URL and anonymous key.
- Approximate coordinates remain in the owner-only discovery-preferences table; discovery exposes calculated distance rather than coordinates.
- Auth callbacks use PKCE authorization-code exchange and accept only Delos auth routes; raw tokens in arbitrary deep links are ignored.
- Session readiness, outcomes, proposal reads, and Band Call applications now enforce blocking server-side. Band Call applications and reports have bounded input and database-backed rate limits.

## Required rollout

1. Back up the production database and apply migrations through `202609200016_security_hardening.sql` in staging first.
2. Run the Supabase database linter and manually test two real test accounts before production rollout.
3. Confirm Edge Function secrets are configured in Supabase, not in Expo `EXPO_PUBLIC_*` variables.
4. Rotate any credential that has ever been committed, pasted into logs, or shipped in a client build.
5. In Supabase Auth, require email confirmation, enable leaked-password protection and CAPTCHA, set conservative auth rate limits, restrict redirect URLs, and enable MFA when the product flow is ready.

## Authorization regression scenarios

Using two normal accounts (A and B) plus a third non-participant account (C), verify:

- A cannot select or update B's private preferences, user row, push devices, subscription, blocks, notifications, reports, or hidden profile.
- C cannot read messages, proposals, or Band Room items for A/B, even with valid UUIDs.
- After either participant blocks the other, both direct table reads and RPC writes for their conversation return no rows or an unavailable error.
- Direct inserts into messages, likes, passes, proposals, and reports fail; supported RPCs enforce identity, membership, validation, blocking, and limits.
- A cannot update `users.role`, `musician_profiles.verified_email`, boost timestamps, or B's profile.
- A cannot create a signed URL for B's hidden/blocked media or for a guessed/unregistered object path.
- Oversized files and disallowed MIME types fail at storage upload, independent of client validation.

## Remaining risks and follow-up

1. Add CI integration tests against a disposable local Supabase stack; the repository currently has static migration regression tests but no running database fixture.
2. Move all profile writes into a transactional RPC so profile plus child-table edits cannot be partially saved.
3. Add durable, distributed rate limits for sign-in, signup, password reset, likes, band-call applications, uploads, and billing endpoints. Current message/report limits are database-window checks.
4. Add server-side media inspection: magic-byte verification, image re-encoding, malware scanning, and video/audio transcoding before making uploads visible.
5. Separate public discovery fields from member-private profile fields with a dedicated view/RPC, and review whether age, availability, transportation, gear, and last-active state should be shown by default.
6. Add audit events and alerts for moderation actions, repeated authorization failures, report spikes, webhook failures, and unusual upload or messaging volume.
7. Review data retention, account-deletion completion, backups, incident response, and privacy/export workflows before launch.
