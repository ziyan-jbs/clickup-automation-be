You are building the backend for a food brand distributor’s field-sales system. Work in this existing repository:

`/Users/muhammadziyan/work/wa/clickup-automation-be`

## Goal and deadline

I need a working backend for a client demo on Saturday, October 3, 2026. The client owns an agency that distributes a food brand to shops. Sales representatives visit shops, take orders for products in boxes, and the agency processes and delivers those orders.

The system will eventually have:
- A React Native app for sales representatives.
- A Next.js web app for the agency owner/admin.
- This NestJS backend, backed by PostgreSQL.

**Your task is to implement the backend only**, including the API contract that the mobile and web apps will use. Build a genuinely usable vertical slice, not just CRUD endpoints or mocked responses.

The core demo must work like this:

1. Admin has products, reps, and shops in the system.
2. Admin assigns shops to a rep.
3. Rep logs in and sees their assigned shops.
4. Rep selects a shop, adds multiple products with box quantities, and submits an order.
5. Admin sees that order immediately in the order list and can review it.
6. Admin accepts the order.
7. If necessary, admin records that fewer boxes were delivered than requested.
8. Admin completes the delivery.
9. Product, shop, and rep reports reflect the delivered quantities and value.

For example: A shop requests 4 boxes of biscuits and 6 boxes of juice. The admin accepts the order but ultimately delivers only 4 boxes of juice. The system must retain both the requested and delivered quantities and report the value of what was delivered.

This is **order taking for later delivery**, not van sales. Do not assume that a rep carries inventory or collects payment during the shop visit.

## Step 1: Inspect and protect the existing repo

Before changing anything:

1. Inspect the repository structure, `package.json`, NestJS modules, ORM/database schema, migrations, Docker Compose, environment files, authentication, tests, and README.
2. Run `git status` and inspect uncommitted changes. Do not overwrite or discard the user’s uncommitted work.
3. Explain briefly which pieces are reusable infrastructure and which are ClickUp automation business logic.
4. Preserve a recoverable copy of the current state using git before deleting or replacing old application code. Use a new branch. If the working tree is dirty, protect the existing changes safely and explain how you handled them.
5. Work only inside the specified repository. Do not delete the repository, its `.git` directory, or Docker database volumes. Do not run `docker compose down -v` as part of cleanup.

Remove the old ClickUp-specific features, entities, integrations, background jobs, configuration, and documentation that no longer apply. Retain and adapt the existing NestJS structure, Docker/PostgreSQL setup, ORM, migrations, linting, and useful common utilities. Follow established repository conventions where they are sound; avoid an unnecessary framework or ORM rewrite.

## Scope and priority

### P0: Must work for the demo

- Authentication with `ADMIN` and `SALES_REP` roles.
- Products.
- Shops and rep assignments.
- Rep order submission with multiple lines.
- Admin order processing, including partial delivery.
- Reports backed by actual order data.
- Migrations, seed data, Swagger/OpenAPI, and working Docker startup.

### P1: Add after P0 is complete

- Rep proposes a new shop, which an admin approves and assigns.
- Shop order history and a repeat-last-order endpoint or response that makes repeat ordering easy for the mobile app.
- Visit record with an outcome such as `ORDER_PLACED`, `SHOP_CLOSED`, `OWNER_UNAVAILABLE`, `ALREADY_STOCKED`, or `PAYMENT_PENDING`.

Do not let P1 delay a complete and reliable P0 journey. If time is limited, implement P0 fully and document P1 as remaining work. Do not build inventory accounting, invoicing, payment collection, promotions, route optimization, notifications, or offline sync for this demo.

## Data model

Adapt names and implementation to the repository’s ORM, but cover these concepts:

### User
- ID, name, email or username, password hash, role, active status, created/updated timestamps.
- Roles: `ADMIN`, `SALES_REP`.
- Inactive users cannot log in or submit orders.

### Shop
- ID, shop name, contact person, phone, address, area, optional location coordinates, active status, approval status if P1 is implemented, created/updated timestamps.
- Current assigned rep, either directly or through a shop assignment table.
- A manager can reassign a shop. Historical orders must continue to point to the rep who actually took them.

### Product
- ID, unique SKU, name, category, optional image URL, price per box, units per box, active status, created/updated timestamps.
- Use a safe money representation, such as integer minor units or a fixed-precision database decimal. Do not calculate money using imprecise floating-point arithmetic.

### Order
- ID and human-readable order number.
- Shop ID, rep ID, status, currency, ordered total, delivered total, optional notes, submitted/accepted/delivered timestamps, created/updated timestamps.
- Use a transaction to create an order and its lines together.

### OrderLine
- Product ID, ordered box quantity, delivered box quantity, unit price snapshot, product name/SKU/pack-size snapshot, ordered line total, delivered line total.
- Historical order details must remain accurate if a product’s name, packaging, or catalog price changes later.

### OrderStatusEvent
- Order ID, previous status, new status, actor ID, timestamp, and optional reason or note.
- Preserve an audit trail when the admin changes status or delivery quantities.

If implementing P1, add a Visit record associated with a rep and shop, visit time, outcome, and note.

Create indexes and uniqueness constraints where they matter, especially product SKU, order number, foreign keys, and common order/report filters.

## Access and business rules

- Admin can manage products, shops, assignments, and users, and process all orders.
- Rep can view only active shops assigned to them and orders they submitted.
- Rep can submit an order only for an active, approved shop assigned to them.
- Do not trust the rep ID, unit price, totals, or status supplied by the mobile client. Derive these on the server.
- An order requires at least one line. Quantities must be positive whole numbers of boxes.
- Reject inactive or unknown products. Decide and document how duplicate product lines in one request are handled; preferably merge them or reject them consistently.
- Submitted orders are locked against rep edits.
- Use an idempotency key or equivalent server-side mechanism so a retry or double tap does not create duplicate orders.
- Admin can accept or cancel a submitted order. Admin can complete an accepted order with delivered quantities from zero through each line’s ordered quantity.
- If every line is delivered in full, status becomes `DELIVERED`. If some but not all requested boxes are delivered, status becomes `PARTIALLY_DELIVERED`. If nothing can be delivered, require cancellation or another clearly documented outcome.
- A cancellation requires a reason. Prevent invalid status transitions and repeated delivery completion.
- Once delivery is finalized, keep the order and snapshots immutable for this demo. Corrections can be a documented future feature.
- Keep shop assignment history or at least preserve the original rep on each order so reassignments do not change historical rep reports.
- Use consistent server-side validation, useful HTTP status codes, and clear error responses.

Use this lifecycle unless existing conventions justify a small adjustment:

`SUBMITTED → ACCEPTED → DELIVERED or PARTIALLY_DELIVERED`

`SUBMITTED or ACCEPTED → CANCELLED`

There is no need to implement warehouse stock reservation for this demo. Do not claim that accepting an order guarantees stock availability.

## API expectations

Implement REST endpoints with sensible request/response DTOs, validation, role checks, pagination, and filters. Final route names may follow repository conventions, but the API must support at least:

### Authentication and users
- Login and get current user.
- Admin creates/lists/activates or deactivates reps.

### Shops
- Admin creates/lists/updates shops and assigns or reassigns reps.
- Rep lists assigned shops and views one assigned shop.
- Shop details include recent orders or provide a separate shop order-history endpoint.
- If P1 is implemented, rep submits a proposed shop and admin approves or rejects it.

### Products
- Admin creates/lists/updates/activates or deactivates products.
- Rep lists active products with current box price and pack information.
- Support basic search/filtering if straightforward.

### Orders
- Rep submits an order with `shopId`, product IDs, ordered box quantities, optional notes, and an idempotency key.
- Rep lists/views own orders, filterable by status and date.
- Admin lists/views all orders, filterable by status, shop, rep, and date.
- Admin accepts an order.
- Admin finalizes delivery with delivered quantities for each line.
- Admin cancels with a reason.
- Order detail returns the status history and both ordered and delivered totals.

### Reports
- Dashboard summary for a date range: submitted order count/value, delivered order count, delivered sales value, and active shops served.
- Top products by delivered boxes and delivered sales value.
- Shops ranked by delivered sales value, with product breakdown for an individual shop.
- Rep leaderboard by delivered sales value, with delivered order count and distinct shops served.
- Sales trend grouped by day for a selected date range.
- Allow date filters and useful optional rep/shop filters where appropriate.

Define the reporting date basis clearly. For delivered-sales reports, use the **delivery completion date**, not submission date. Cancelled orders contribute nothing to delivered sales. Partially delivered orders contribute only their delivered quantities. Default currency can be PKR for the demo, but keep it explicit in responses.

Provide Swagger/OpenAPI documentation with example request and response bodies, including authentication. Make it easy for another Codex agent to build the React Native and Next.js apps without guessing field names or status behavior.

## Seed data and demo readiness

Create a repeatable seed command with realistic, clearly fictional data:
- One admin and two sales reps.
- Approximately 8–12 food products across several categories.
- At least 8–10 shops across a few areas, assigned to the reps.
- A mix of submitted, accepted, delivered, partially delivered, and cancelled orders over several dates.
- Enough delivered orders for the charts and leaderboard to be meaningful on first login.

Do not hardcode private credentials in tracked source files. Use documented demo credentials through a seed configuration or development-only environment variables and explain how to use them. The seed must not create duplicate records every time it runs.

## Verification

Make the entire P0 flow work against the real PostgreSQL database, not in-memory data or mocks. At minimum, verify:
- Rep cannot submit for another rep’s shop.
- Price and total come from the server, even if the client sends a different price.
- Double submission with the same idempotency key creates one order.
- The example partial delivery retains 6 ordered juice boxes and 4 delivered juice boxes.
- Delivered reports reflect 4 juice boxes, not 6.
- Reassigning a shop does not change the rep on an old order.
- Invalid status transitions fail.
- Docker startup, migrations, and seed run successfully.

Add focused tests for the critical rules above using the repository’s existing testing approach. Run lint/type checking and applicable tests, and fix failures. Do not spend time adding trivial tests that only repeat implementation details.

## Working style and final handoff

Implement the work, rather than stopping after producing a plan. Proceed in this order:

1. Inspect and protect the existing repository.
2. Cleanly replace old ClickUp-specific code.
3. Implement schema, migrations, and seed support.
4. Implement authentication and access control.
5. Implement shops and products.
6. Implement the order lifecycle end to end.
7. Implement reports.
8. Document and verify the API and Docker startup.

If you encounter an ambiguity, make a sensible demo assumption, record it in the README, and continue. Prioritize a working complete flow over optional features or visual polish.

At the end, report:
- What was preserved and what ClickUp-specific code was removed.
- The branch and protection point for the original state.
- The modules, entities, and endpoints implemented.
- Exact commands to configure environment variables, start Docker, migrate, seed, run tests, and open Swagger.
- How to obtain the demo logins.
- A short example API flow from login through delivered order to updated reports.
- Any incomplete items and assumptions.