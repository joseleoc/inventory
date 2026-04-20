---
name: "Organization Management Foundation"
description: "Implement organization creation, user assignment by email, and authenticated organization context in zustand"
argument-hint: "Optional: invitation flow preference, org data fields, and role model"
agent: "agent"
model: "GPT-5 (copilot)"
---

Implement the organization-management foundation for this inventory app.

Primary goal:

- Allow creating organizations.
- Allow assigning users to organizations by email.
- Persist and expose the logged-in user's active organization context in a zustand store so the whole app can consume it.

Required scope:

1. Firebase data model definition

- Define the Firestore collections/documents required for organization management.
- Include a clear schema/table definition section in docs for:
  - organizations
  - organization_members (or equivalent membership model)
  - user profile linkage if needed
  - invitations or assignment records for email-based onboarding
- For each collection, specify fields, types, required constraints, and indexes.
- Include security-rule intent for tenant isolation and role-based access.

2. Organization creation form

- Create a new authenticated screen inside the drawer flow to create an organization.
- Build a typed, validated form using existing project conventions.
- Include loading, success, and error states.
- On success, persist organization document and create the creator membership with an admin/owner role.

3. Assign users to organization by email

- Implement a flow to assign users to any organization using email.
- Use a hybrid strategy: if user exists, create or update membership; if user does not exist, create a pending invitation/assignment record.
- Prevent duplicate active memberships for the same organization/email pair.

4. Organization context in zustand

- Create or update a zustand organization store for app-wide context.
- On login, resolve organization context for the authenticated user and store:
  - active organization id
  - active organization display data
  - user role in the active organization
  - loading/error state
- Expose actions for:
  - initialize organization context after auth
  - switch active organization (for users with multiple org memberships)
  - clear context on logout

Membership model requirements:

- Support multi-organization memberships for a single user.
- Support active-organization switching while keeping membership-role checks organization-scoped.

5. Integration expectations

- Ensure authenticated routes can read organization context from the store.
- Ensure organization-scoped operations use the active org id from the store.
- Reuse existing Firebase configuration and auth store patterns in this repository.
- Keep business logic in services/stores, not only in route components.

6. Output requirements

- Implement code changes directly.
- Provide a short migration/rollout note for existing users without an organization.
- Provide test steps for Android and Web.
- Summarize changed files and reasoning.

Output format:

1. Plan
2. Changes made
3. Firestore model definition
4. Validation and test steps
5. Next steps

If invocation input provides additional constraints, apply them while keeping all requirements above mandatory.

Invocation-specific details:

- {{input}}
