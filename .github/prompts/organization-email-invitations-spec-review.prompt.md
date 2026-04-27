---
name: "Organization Email Invitation Spec Review"
description: "Create a spec-first review for email-only organization invitations, post-auth invitation handling, and active organization setup"
argument-hint: "Optional: invitation expiry, roles, UI copy constraints, and rollout constraints"
agent: "agent"
model: "GPT-5 (copilot)"
---

Create a feature specification first, then review implementation readiness for organization invitations in this inventory app.

Primary objective:

- Define a complete, implementation-ready feature specification before writing code.
- Review the current codebase and identify what must change to support the target flow.

Feature scope (mandatory):

1. Invitation model (email-only)

- Users can only be invited to organizations by email.
- Invitations must support both:
  - existing platform users
  - users not yet registered
- Define invitation lifecycle states (`pending`, `accepted`, `declined`, `revoked`, `expired`) and transition rules.
- Prevent duplicate active invitations for the same normalized email and organization.

2. Post-auth invitation resolution

- On sign up and on login, resolve pending invitations for the authenticated email.
- If invitations exist, present accept/decline flow before normal app continuation.
- If accepted:
  - create/activate membership
  - show organization in user settings
  - set it as current active organization
- If declined:
  - continue normal app flow without changing organization context

3. No-organization fallback

- If user has no organizations and no accepted invitations, show onboarding to create a new organization.

4. Data model and security intent

- Propose Firestore collections/documents, required fields, constraints, and indexes.
- Include normalized email strategy and uniqueness approach.
- Include security rule intent so only authorized organization members can invite by email.

5. UX/state integration intent

- Cover how auth flow, organization store, and settings should interact.
- Define loading, empty, error, and conflict states.

Project context to inspect:

- Organization services: [services/organizations.ts](../../services/organizations.ts)
- Auth and org state: [stores/auth-store.ts](../../stores/auth-store.ts), [stores/organization-store.ts](../../stores/organization-store.ts)
- Auth routes: [app/(auth)/login.tsx](../../app/(auth)/login.tsx), [app/(auth)/signup.tsx](../../app/(auth)/signup.tsx)
- Settings route: [app/(tabs)/settings.tsx](../../app/(tabs)/settings.tsx)
- Architecture docs: [docs/inventory-management-technical-architecture.md](../../docs/inventory-management-technical-architecture.md)

Important constraints:

- Do not implement code changes in this step.
- If requirements are ambiguous, call them out explicitly before proposing final decisions.
- Keep recommendations aligned with existing project patterns and file structure.

Output format:

1. Scope summary (from invocation input)
2. Assumptions and open questions
3. Feature specification
   - user stories
   - acceptance criteria
   - state transitions
4. Firestore model and security-rule intent
5. Implementation review of current codebase
   - what already exists
   - gaps and risks
   - file-by-file change plan (no code yet)
6. Rollout and migration considerations
7. Test plan (manual + edge cases)
8. Suggested next implementation prompt

Invocation-specific details:

- {{input}}