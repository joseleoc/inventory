---
name: "Supermarket Sales Carts and Checkout"
description: "Implement fast product search and barcode scanning with multi-cart supermarket sales flow and concurrency-safe stock updates"
argument-hint: "Optional: tax rules, discount logic, payment capture strategy, and receipt format"
agent: "agent"
model: "GPT-5 (copilot)"
---

Implement the supermarket-style selling flow now that product creation already exists.

Core objective:

- Let cashiers search products quickly by name, SKU, or barcode.
- Support camera barcode scanning on phone for rapid add-to-cart.
- Allow multiple shopping carts open at the same time for different customers.
- Let users set quantities per cart line.
- On checkout, create immutable sales records and reduce product stock with concurrency-safe writes.

Project context:

- Existing product creation and inventory model are already in place.
- Follow existing app architecture and conventions in this workspace.
- Use references from [docs/inventory-management-technical-architecture.md](../../docs/inventory-management-technical-architecture.md), [app/(tabs)/add-product.tsx](<../../app/(tabs)/add-product.tsx>), and [services/products.ts](../../services/products.ts).

Required implementation scope:

1. Product lookup and scan UX

- Build a fast input flow that accepts:
  - product name text
  - SKU text
  - barcode text
- Add phone-camera barcode scanning support with robust fallback to manual entry.
- Optimize lookup responsiveness and avoid duplicate rapid scan inserts.
- Keep lookup tenant-aware using active organization context.

2. Multi-cart management

- Create a cart system that supports multiple simultaneous carts for different clients.
- Use local-only state persistence for draft carts (device/session scope) unless invocation explicitly overrides this.
- Include cart state actions for:
  - create cart
  - switch active cart
  - add/remove line item
  - increment/decrement quantity
  - clear cart
  - archive/complete cart after checkout
- Persist cart identity and state predictably so users can switch between clients without losing progress.

3. Cart line and pricing behavior

- Each cart line must include product identity snapshot and quantity.
- Snapshot line price when item is added to cart.
- Validate quantity as integer > 0.
- Prevent over-selling at UI level when known stock is insufficient.
- Show clear feedback for out-of-stock and low-stock conditions.

4. Checkout and stock mutation

- Implement checkout flow that writes immutable sale records and updates product stock.
- Use Firestore transaction or batch strategy to handle concurrent writes safely.
- Validate and deduct stock at checkout transaction time (no stock reservation during draft cart state).
- Ensure stock deduction is atomic and guarded against negative inventory.
- Record idempotency metadata for retry-safe completion where appropriate.

5. Data model and services

- Define or update service-layer types and functions for:
  - cart lifecycle
  - sale commit
  - stock reconciliation
- Keep business logic in services/stores, not route components.
- Reuse existing auth + organization context stores.

6. Security and role alignment

- Respect Firestore rules and role constraints in implementation.
- Ensure only authorized users can checkout and mutate stock.
- Keep all writes organization-scoped.

7. Delivery requirements

- Create/update required files directly.
- Add concise notes for schema/index/rule updates needed for sales flow.
- Provide Android and Web manual test scenarios including:
  - barcode scan path
  - text search path
  - multi-cart switching
  - concurrent checkout conflict behavior

Output format:

1. Plan
2. Changes made
3. Concurrency and data-integrity strategy
4. Validation and test steps
5. Next steps

Invocation-specific details:

- {{input}}
