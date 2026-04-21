---
name: "Create Firebase Login Page"
description: "Create a login page using Firebase email/password auth, with forgot password and no signup flow"
argument-hint: "Optional: UI style, copy tone, and validation rules"
agent: "agent"
model: "GPT-5 (copilot)"
---

Create or update the authentication flow in this project with these requirements:

- Use Firebase SDK email/password authentication.
- Create the login page at `app/(auth)/login.tsx`.
- Implement login with email and password on `app/(auth)/login.tsx`.
- Create a dedicated forgot-password page at `app/(auth)/forgot-password.tsx`.
- Implement forgot-password using Firebase password reset email on that page.
- Do not create a signup page.
- Do not add signup links, buttons, or route references.

Route access requirements:

- Pages under `app/(auth)/` must be protected and only accessible when the user is not logged in.
- If the user is logged in, redirect from `app/(auth)/` routes to the home page.
- Do not leave unprotected auth routes reachable by authenticated users.

Implementation requirements:

- Follow existing project patterns, naming, and file organization.
- Reuse existing Firebase configuration from this workspace.
- Use TypeScript and keep code strongly typed.
- Add loading, error, and success states for auth actions.
- Validate email format and required fields before submit.
- Keep UI accessible and mobile-friendly.
- use react hook form and zod for form handling and validation.
- use a zutstand store to store user auth state and provide it across the app.

Delivery requirements:

- Make the code changes directly in the workspace.
- Keep changes minimal and focused on this task.
- At the end, summarize changed files and how to run/test the flow.

If the invocation includes extra constraints (for example UI theme or copy tone), apply them while keeping the requirements above mandatory.
