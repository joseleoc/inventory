---
name: "Organization Invitation Interaction Spec"
description: "Create a complete spec for email-based organization invitations with 1-month expiry, member role assignment, auto-switch on accept, and hidden revoked invites"
argument-hint: "Optional: UX copy constraints, conflict-resolution policy, and analytics/telemetry requirements"
agent: "agent"
model: "GPT-5 (copilot)"
---

Create a single, implementation-ready specification for how users interact with organizations through email invitations in this inventory app.

Primary objective:

- Define the end-to-end behavior for inviting users by email into existing organizations.
- Ensure invitation handling is explicit on app start and login.
- Define how accepted invitations update membership and active organization context.

Mandatory requirements:

1. Invitation creation

- Inviting by email into an existing organization must create a `pending` invitation.
- Invitations are organization-scoped and email-scoped.
- Prevent duplicate active invitations for the same normalized email and organization.
- Invitations must expire automatically 1 month after creation and transition to `expired`.

2. Invitation visibility after authentication

- Pending invitations for the authenticated email must be surfaced the next time the user starts or logs into the app.
- Define where this appears in UX flow and how multiple pending invitations are handled.

3. Invitation decision

- The invited user can `accept` or `reject` each invitation.
- If accepted:
  - add the user to the organization's users/memberships
  - assign the default organization role as `member`
  - auto-switch and set that organization as the current active organization context
- If rejected:
  - keep invitation history state updated
  - do not change active organization context

4. User-organization relationship model

- Define how users and organizations are related (many-to-many membership model).
- Specify required entities, fields, constraints, and index intent.
- Include role linkage and organization-scoped authorization intent.

5. Lifecycle and state machine

- Define invitation states and allowed transitions.
- Include `pending`, `accepted`, `rejected`, `revoked`, and `expired`.
- `revoked` invitations must be hidden from the invitee-facing app UI history.

Project context to inspect:

- Organization services: [services/organizations.ts](../../services/organizations.ts)
- Auth and org state: [stores/auth-store.ts](../../stores/auth-store.ts), [stores/organization-store.ts](../../stores/organization-store.ts)
- Auth screens: [app/(auth)/login.tsx](<../../app/(auth)/login.tsx>), [app/(auth)/signup.tsx](<../../app/(auth)/signup.tsx>)
- Settings or org UI entry points: [app/(tabs)/settings.tsx](<../../app/(tabs)/settings.tsx>), [app/(tabs)/organizations.tsx](<../../app/(tabs)/organizations.tsx>)
- Security rules baseline: [firestore.rules](../../firestore.rules)

Constraints:

- Call out ambiguities and assumptions before finalizing the spec.
- Keep recommendations aligned with the current Expo + Firebase + Zustand architecture.

Output format:

1. Scope summary
2. Assumptions and open questions
3. User journey and UX flow
4. Invitation lifecycle state machine
5. Data model (collections/documents, fields, constraints, indexes)
6. Security rules intent and authorization matrix
7. Store/service integration plan (auth, organization context, invitation resolution)
8. Acceptance criteria (functional and edge cases)
9. Non-functional requirements (performance, resilience, observability)
10. Rollout and migration notes
11. Suggested follow-up implementation prompt

Invocation-specific details:

- {{input}}
