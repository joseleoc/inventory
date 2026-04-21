---
name: "Product Catalog Management Flow"
description: "Extract reusable product selector from sales and build paginated products list with soft-delete and dedicated edit/restock page"
argument-hint: "Optional: list card fields, extra filters, and edit form details"
agent: "agent"
model: "GPT-5 (copilot)"
---

Implement the product catalog browsing and maintenance flow for this inventory app.

Core objective:

- Reuse the product search/selector UX already present in [app/(tabs)/sales.tsx](<../../app/(tabs)/sales.tsx>) by extracting it into a dedicated reusable component.
- Build a new authenticated products page that uses the reusable selector for searching.
- Add paginated product listing with general product info, soft-delete (set inactive), and navigation to a dedicated edit page where restock is prioritized.

Project context:

- Existing product create/update logic is in [services/products.ts](../../services/products.ts).
- Existing sales product lookup logic is in [services/sales.ts](../../services/sales.ts).
- Product schema and indexes are documented in [docs/inventory-management-technical-architecture.md](../../docs/inventory-management-technical-architecture.md).
- Sales lookup/index constraints are noted in [docs/sales-flow-schema-notes.md](../../docs/sales-flow-schema-notes.md).

Required implementation scope:

1. Extract reusable product selector

- Refactor the product search + results selector currently embedded in [app/(tabs)/sales.tsx](<../../app/(tabs)/sales.tsx>) into a reusable component under `components/`.
- Preserve existing behavior for sales: debounce, active-org awareness, loading/error states, and add callback support.
- Keep scanner functionality in sales route if that behavior is sales-specific, but keep text search selector reusable.
- Ensure the sales page consumes the new component without behavior regression.

2. Create new products page in authenticated navigation

- Add a new route inside `app/(tabs)` for product browsing/management.
- Add drawer navigation entry in [app/(tabs)/\_layout.tsx](<../../app/(tabs)/_layout.tsx>) so authenticated users can access it.
- The page must rely on active organization context and show clear empty-state messaging when no organization is selected.

3. Paginated product list

- Implement product listing service logic (if missing) for active products, organization-scoped.
- Use Firestore-friendly pagination (cursor-based preferred) with explicit next-page behavior.
- Use 20 items per page by default.
- Default sort should be recency (`updated_at` descending) unless invocation input overrides it.
- Show general info per item at minimum: name, sku, optional barcode, current stock, stock threshold, and selling price.
- Include loading, refresh, empty, and error states.

4. Search behavior on products page

- Reuse the extracted selector component to drive search and quickly surface product matches.
- Ensure search is tenant-aware and does not leak across organizations.
- Allow selecting a search result to focus/open that product in the products list context.

5. Soft-delete (inactivate) product

- Implement delete action as soft-delete only (`is_active = false`) using existing update pathways in [services/products.ts](../../services/products.ts).
- Never hard-delete product documents.
- Add confirmation UX before inactivation and clear success/error feedback.
- Show only active products in this page flow (exclude inactive products by default).

6. Dedicated edit page with restock priority

- Add a separate route/page for editing a specific product (do not do full edit inline on list page).
- Place restock controls and stock increment action as the first section on the edit page.
- Reuse `addProductStock` and `updateProduct` service contracts where possible.
- Keep validations consistent with existing product constraints (non-negative numeric checks, trimmed text, etc.).

7. Delivery requirements

- Update/create all necessary files directly.
- Reuse existing theming/components patterns.
- Keep business logic in services/stores instead of route-only logic.
- Include concise manual test steps for Android and Web.

Output format:

1. Plan
2. Changes made (file-by-file)
3. Pagination and search strategy
4. Validation and manual test steps
5. Next steps

Invocation-specific details:

- {{input}}
