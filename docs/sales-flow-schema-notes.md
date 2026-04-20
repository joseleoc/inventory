# Sales Flow Schema and Rules Notes

## Firestore Writes Used by Sales Checkout

Checkout transaction currently writes:

1. `products/{productId}`

- Decrement `current_stock`
- Update `updated_by`
- Update `updated_at`

2. `sales/{saleDocId}` (one document per cart line)

- `org_id`
- `sale_id`
- `client_txn_id`
- `product_id`
- `sku`
- `quantity`
- `unit_price`
- `total_amount`
- `sold_by`
- `sold_at`
- `created_at_client`
- `device_id`
- `cart_id`
- `cart_label`

## Security Rule Notes

`firestore.rules` was updated so cashier role can update products only for stock deduction use cases.

Cashier product updates are now restricted to changing only:

- `current_stock`
- `updated_at`
- `updated_by`

Additional guards:

- `current_stock` must stay integer and non-negative.
- `current_stock` must not increase in cashier path.
- `updated_by` must equal authenticated user UID.

Manager/admin paths remain available for broader product updates.

## Index Notes

Current lookup query in `services/sales.ts` uses:

- `where("org_id", "==", orgId)`
- `where("is_active", "==", true)`
- `orderBy("updated_at", "desc")`

This relies on the existing composite index documented for `products`.

Sales documents are written by deterministic IDs and currently not queried by composite filters in this implementation.
