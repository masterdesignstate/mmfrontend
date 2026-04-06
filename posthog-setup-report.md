<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the matchmaking platform. PostHog is initialized via `instrumentation-client.ts` (the recommended approach for Next.js 15.3+), with event ingestion proxied through `/ingest` rewrites in `next.config.ts` to improve ad-blocker resistance. Users are identified on login and signup using `posthog.identify()`. Exception tracking via `posthog.captureException()` is wired up to all critical error boundaries. Twelve business events are now tracked across nine files covering the full user lifecycle: registration, onboarding, discovery, matching, and messaging.

| Event | Description | File |
|---|---|---|
| `user_signed_up` | User successfully created a new account | `src/app/auth/register/page.tsx` |
| `user_logged_in` | User successfully authenticated | `src/app/auth/login/page.tsx` |
| `login_failed` | User attempted login but authentication failed | `src/app/auth/login/page.tsx` |
| `profile_photo_uploaded` | User uploaded a profile photo during onboarding | `src/app/auth/add-photo/AddPhotoClient.tsx` |
| `profile_liked` | User liked another user's profile in the discovery feed | `src/app/results/page.tsx` |
| `match_created` | A mutual match was made (both users liked each other) | `src/app/results/page.tsx` |
| `message_sent` | User sent a message in a chat conversation | `src/app/chats/[id]/page.tsx` |
| `match_opened` | User clicked on a match to open the conversation | `src/app/matches/page.tsx` |
| `question_answered` | User submitted an answer to a compatibility question | `src/app/questions/[id]/page.tsx` |
| `profile_updated` | User saved changes to their profile | `src/app/profile/edit/page.tsx` |
| `email_changed` | User successfully changed their account email | `src/app/settings/page.tsx` |
| `password_changed` | User successfully changed their account password | `src/app/settings/page.tsx` |

## Next steps

We've built a dashboard and five insights for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard**: [Analytics basics](https://us.posthog.com/project/367036/dashboard/1425799)
- **Insight**: [User Registration to First Login Funnel](https://us.posthog.com/project/367036/insights/Yc6oAfuS) — Onboarding conversion: sign up → photo upload → first login
- **Insight**: [Login to Match Conversion Funnel](https://us.posthog.com/project/367036/insights/Ep2u9v4Q) — Product core loop: login → like → match
- **Insight**: [Daily Sign Ups & Logins](https://us.posthog.com/project/367036/insights/Ozk0vLqt) — Acquisition and retention trend
- **Insight**: [Likes, Matches & Messages Trend](https://us.posthog.com/project/367036/insights/aL1zLJz6) — Engagement volume over time
- **Insight**: [Login Failures Over Time](https://us.posthog.com/project/367036/insights/tWRQdik4) — Auth error monitoring

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
