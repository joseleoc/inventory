---
description: "Create the first Add Product page for the inventory app with auth guard, validated form fields, and Firestore-ready payload"
name: "Add Products First Step"
argument-hint: "Route name/location and any UI preferences for the add-product form"
agent: "agent"
---

Build the first step of product creation in this Expo inventory app.

Goal:

- Create a new authenticated page where a signed-in user can add a product.
- The page must be reachable from the authenticated app flow and inaccessible to unauthenticated users.
- Implement a production-minded form that maps exactly to the `products` collection requirements in [docs/inventory-management-technical-architecture.md](../../docs/inventory-management-technical-architecture.md).

Requirements:

1. Routing and auth

- Add a new route inside the authenticated tabs flow under `app/(tabs)`.
- Ensure the page is protected by existing auth guard behavior (do not duplicate auth logic if [app/\_layout.tsx](../../app/_layout.tsx) already enforces this).
- Add a visible navigation entry so authenticated users can access this page.

2. Form fields and validation

- Required inputs: `sku`, `name`, `current_stock`, `stock_threshold`, `unit_price`.
- Optional inputs: `barcode`, `description`, `category`.
- Internal/default fields (not manually typed by user unless explicitly requested): `is_active` (default true), `org_id`, `created_by`, `updated_by`, `created_at`, `updated_at`.
- Validate:
  - `current_stock` integer >= 0
  - `stock_threshold` integer >= 0 (default 10)
  - `unit_price` numeric >= 0
  - trim text fields and reject empty required strings
- Show clear inline validation and submit-state feedback.

3. Data contract and constraints

- Build a typed payload object and implement the real Firestore create flow.
- Respect logical constraints from the architecture:
  - unique `(org_id, sku)`
  - optional unique `(org_id, barcode)` when barcode exists
- Assume uniqueness is backend-enforced; do not add client-side uniqueness prechecks.

4. Code quality

- Reuse existing theming/components patterns in this repo.
- Keep business/data logic outside presentation components when feasible.
- Prefer small, composable helpers for parsing and validation.
- Keep TypeScript types explicit for form state and payload.

5. Deliverables

- Create/update all needed files.
- Summarize what changed and why.
- Include quick test steps for Android and Web.
- List follow-up steps to connect to Firestore write flow if mocked locally.

Output format:

1. `Plan` (short)
2. `Changes made` with file-by-file notes
3. `Validation` (what was checked)
4. `Next steps` (numbered)

User-provided details for this run:

- {{input}}
