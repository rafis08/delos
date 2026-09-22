# Delos beta support and safety runbook

Support email: **support@delosmusic.app**

## Intake and response targets

1. Requests enter `support_tickets` with a reference such as `DELOS-12AB34CD`.
2. Safety tickets are automatically marked urgent. Review urgent safety reports as soon as possible; target under four hours during the private beta.
3. Account, billing, and technical requests target one business day. Feedback may receive a grouped response.
4. Staff set a ticket to `in_progress`, `waiting_on_user`, or `resolved`. Never request passwords, verification codes, card numbers, or precise addresses.

## Support → Development escalation

Escalate only reproducible defects, data-integrity problems, security concerns, or issues requiring a code/configuration change. Use the in-app **Escalate** action, then send Development:

- ticket reference and category;
- expected versus actual behavior;
- safe reproduction steps;
- app/build/platform/OS/device diagnostics when the member consented;
- severity and number of affected users;
- sanitized logs with tokens, emails, messages, precise locations, and payment data removed.

Development returns status and a release/build reference to Support. Support—not Development—communicates with the member unless a security lead approves otherwise.

## Moderation path

1. Review the report reason and supplied context. Do not assume a report is proof.
2. Check repeat-report patterns and relevant account history using authorized tools only.
3. Dismiss unsupported reports, suspend for seven days when temporary risk controls are appropriate, or ban for serious/repeated violations.
4. Every action is recorded in `moderation_actions` with the moderator, target, related report, action, notes, and time.
5. Imminent threats, suspected child exploitation, or credible real-world danger require immediate escalation to the designated safety lead and, where legally required, the appropriate authority. Delos support is not an emergency service.

Before beta begins, assign named primary and backup owners for Support, Safety, Development, and legal/emergency escalation.
