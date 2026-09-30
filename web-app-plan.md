Build the complete admin web app for my food distributor field-sales demo. Implement it in one sustained pass: inspect the existing frontend, protect its current state, replace the ClickUp business features, integrate the real NestJS API, run the app, test the main workflows, and hand over a working demo. Do not stop after a plan, scaffold, or static design.

## Project and business context

The client owns an agency distributing a food brand to shops. Sales representatives visit shops and submit orders for products in boxes using a React Native app. The agency owner or admin uses this web app to manage reps, shops, products, orders, deliveries, and reports.

The backend already exists at:

`/Users/muhammadziyan/work/wa/clickup-automation-be`

The existing Next.js frontend repository is `clickup-fe`, likely alongside the backend at:

`/Users/muhammadziyan/work/wa/clickup-fe`

Verify the actual path before making changes. Work only in the frontend repository, apart from read-only inspection and integration testing of the backend. Do not modify the React Native app.

The backend runs locally on port 4000:
- Swagger UI: `http://localhost:4000/docs`
- OpenAPI JSON: `http://localhost:4000/docs-json`
- API base path: `/api`

Read the backend README and the latest generated OpenAPI JSON before implementing API calls. I will attach the updated OpenAPI JSON to this task. The running API and its generated contract are authoritative if this prompt or an old README differs.

The client demo is Saturday, October 3, 2026. Deliver a complete and impressive admin experience that works against real seeded PostgreSQL data.

## Mandatory repository preservation before cleanup

This repository currently contains ClickUp frontend work. I authorize replacing the ClickUp-specific application with the field-sales admin app, but preserve the original work in git first.

1. Inspect the repo structure, package scripts, Next.js version and router, TypeScript setup, styling system, component library, API client, authentication approach, tests, environment configuration, and git status.
2. Inspect the configured git remotes and current branch. Check for uncommitted and untracked work. Do not silently discard, overwrite, or publish secrets.
3. Create a clearly named backup branch representing the original ClickUp frontend and push it to the existing remote before deleting ClickUp code. If there are uncommitted changes, preserve legitimate project changes in that backup safely; exclude `.env` files, credentials, build output, and other secrets. Record the backup branch and commit.
4. Create a separate feature branch for the new field-sales app. Do not develop directly on `main`.
5. If the remote is unavailable or pushing fails, preserve the original state locally, continue reversible implementation, and clearly report that the remote backup could not be completed. Never claim a branch was pushed when it was not.
6. Once the new app is complete and verified, commit and push its feature branch to the configured remote. Report the branch name and commit. Do not merge into `main` unless I separately request it.

Remove all ClickUp-specific business screens, terminology, API calls, types, assets, integrations, feature flags, and documentation. Preserve useful architecture: Next.js setup, routing approach, TypeScript configuration, styling foundation, reusable UI primitives, linting, test infrastructure, and deployment configuration where appropriate. Clean up dependencies that are no longer needed. Do not leave broken links or old ClickUp navigation.

## Product scope

This is an **ADMIN-only web app**. A sales rep who logs in must not see or use admin screens. The backend remains responsible for authorization; do not rely on hiding buttons as the only restriction.

Implement these P0 sections completely:

1. Login and session management.
2. Dashboard.
3. Orders and delivery processing.
4. Shops and rep assignments.
5. Products.
6. Sales representatives.
7. Reports and charts.

The backend does not yet implement shop proposals, visit outcomes, inventory accounting, payments, invoicing, promotions, or notifications. Do not fabricate these features or show dead menu items for them.

## The live demo journey

The finished web app must support this story:

1. Admin signs in.
2. Dashboard shows submitted orders, delivered sales, active shops served, and a sales trend from real API data.
3. Admin sees an order placed by a rep on the React Native app appear in the order queue.
4. Admin opens the order, sees shop, rep, products, requested boxes, price snapshots, and status history.
5. Admin accepts it.
6. Shop requested 4 boxes of biscuits and 6 boxes of juice; admin records delivery of 4 biscuit boxes and only 4 juice boxes, with a note explaining the shortage.
7. Order becomes `PARTIALLY_DELIVERED`, preserving 6 requested and 4 delivered juice boxes.
8. Dashboard, product report, shop report, and rep leaderboard update from that completed delivery.
9. Admin can manage products, add shops, reassign a shop to a rep, and manage rep accounts.

There is no automatic stock reservation when an order is accepted. Do not label an accepted order as guaranteed in stock.

## API and data integration

Use the actual OpenAPI schemas to create a typed API layer. Do not scatter raw URLs, fetch logic, or unchecked `any` types across page components.

Relevant backend routes include:

### Authentication
- `POST /api/auth/login`
- `GET /api/auth/me`

### Sales representatives
- `GET /api/users/sales-reps`
- `POST /api/users/sales-reps`
- `PATCH /api/users/sales-reps/:id/status`

### Products
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PATCH /api/products/:id`

### Shops
- `GET /api/shops`
- `GET /api/shops/:id`
- `POST /api/shops`
- `PATCH /api/shops/:id`
- `PATCH /api/shops/:id/assignment`

### Orders
- `GET /api/orders`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id/accept`
- `PATCH /api/orders/:id/delivery`
- `PATCH /api/orders/:id/cancel`

### Reports
- `GET /api/reports/dashboard`
- `GET /api/reports/products`
- `GET /api/reports/shops`
- `GET /api/reports/shops/:id/products`
- `GET /api/reports/reps`
- `GET /api/reports/trend`

Lists are paginated with `{ items, total, page, limit }`. Use the documented query filters and types. The API reports PKR values in integer minor units: `72000` means PKR 720.00. Use one shared, tested money-formatting utility. Do not divide values inconsistently between cards, tables, and chart tooltips.

The API supports these order statuses:
`SUBMITTED`, `ACCEPTED`, `DELIVERED`, `PARTIALLY_DELIVERED`, `CANCELLED`.

Only allow transitions supported by the backend. Delivery requires an entry for **every order line ID**, including lines delivered in full. Each `deliveredBoxes` must be between zero and the ordered box quantity. If nothing is delivered, the order must be cancelled rather than finalized as a zero-box delivery. Cancellation requires a reason. Finalized orders are read-only.

Use server values for prices and totals. Preserve the distinction between:
- **Submitted order value:** requested order value, based on submission date; may include orders later delivered or cancelled according to backend report semantics.
- **Delivered sales value:** actually delivered boxes, based on delivery completion date.
- **Ordered versus delivered boxes:** both must remain visible for partially delivered orders.

Date filters use inclusive UTC calendar dates in the backend. Make the selected range and its UTC meaning clear in the UI. Do not accidentally shift the date when converting to the browser’s local timezone.

## Authentication and session design

Implement a secure, practical admin session using the existing Next.js architecture:

- Sign-in form with email, password, validation, loading state, and useful errors.
- Submit credentials to the NestJS login endpoint.
- Store the access token in a server-managed, HttpOnly, SameSite cookie where compatible with the app architecture. Avoid putting it in localStorage.
- Configure cookie security appropriately for local HTTP development and HTTPS deployment.
- Keep the NestJS API origin in a server-side environment variable; do not expose tokens or secrets through `NEXT_PUBLIC_` values.
- Use a consistent server-side API access layer or narrowly scoped Next.js route handlers/server actions as appropriate. Check authentication and ADMIN authorization in each protected operation. Next.js route handlers are public endpoints unless explicitly protected.
- Verify the session with `/auth/me`, and reject inactive or non-ADMIN users. Redirect unauthorized users to a clear access-denied or login state.
- Handle token expiration and backend 401 responses by clearing the session and requiring login. The backend does not expose a refresh-token flow; do not invent one.
- Logout must clear the session and any user-specific cached data.
- Avoid caching private admin data across users or showing stale report/order data after a mutation.
- Keep backend errors useful but do not leak tokens or passwords into logs or UI.

Use the backend seed admin account `admin@demo.test`; the password comes from the backend’s `DEMO_PASSWORD` setting. Do not hardcode that password in tracked files.

## Pages and interactions

### 1. Login
Create a branded login experience, not a generic form on an empty page. Include visible product identity, a concise explanation of what the system does, polished form states, and responsive behavior.

### 2. Dashboard
Build an executive overview that helps the agency owner see what needs attention:
- Submitted order count and submitted order value.
- Delivered order count and delivered sales value.
- Active shops served.
- Recent submitted orders requiring action.
- Delivered sales trend.
- Top products and top reps, using actual report endpoints where available.
- Date-range control, with a useful default range that displays the seeded demo data.

Cards and charts must show units, currency, comparison basis, and clear empty states. Do not invent percentage changes or performance targets when the backend does not supply comparison data.

### 3. Orders
Provide a useful operations screen:
- Paginated table with order number, shop, rep, submitted date, ordered amount, delivered amount, and status.
- Filters for status, shop, rep, and submission-date range as supported by the API.
- Clear status pills and an obvious queue for `SUBMITTED` orders.
- Refresh action or sensible refetching so an order placed on the mobile app appears without a full browser reload. Poll the active order queue at a reasonable interval or implement another simple supported approach; do not imply WebSockets exist if they do not.
- Loading, empty, and error states.

The order detail should show:
- Shop and rep details.
- Every product line with SKU, price per box, requested boxes, delivered boxes, and line totals.
- Ordered and delivered totals.
- Submission, acceptance, and delivery timestamps when present.
- Status event timeline with actors and notes when available.
- Notes from the rep.

Actions:
- Accept only a `SUBMITTED` order.
- Cancel a `SUBMITTED` or `ACCEPTED` order using a confirmation dialog with a required reason.
- For an `ACCEPTED` order, open a focused delivery form listing every order line. Start with sensible values, allow an admin to adjust delivered boxes, show the recalculated provisional delivered total, collect an optional note, and confirm before finalizing.
- On success, use the backend response to update the view and relevant report queries.
- Show useful handling for `409` invalid transitions, stale status, or a second admin processing the same order. Refetch the order and explain what changed.
- Do not add an “Edit requested order” action; the current API does not provide one.

### 4. Shops
- Paginated list with shop name, area, contact, phone, assigned rep, active state, and a path to details.
- Add and edit shop forms based on actual backend DTOs.
- Assign or reassign a rep using `PATCH /api/shops/:id/assignment`.
- A shop detail with contact/address, current rep, recent orders, and a clear link to that shop’s product breakdown report.
- Activation/deactivation if supported by the update DTO.
- Validate fields and display server errors clearly.
- Preserve historical order attribution to the original rep after a reassignment; display historical orders according to backend data.

### 5. Products
- Paginated, searchable catalog management table or grid.
- SKU, name, category, optional image, PKR price per box, units per box, active state.
- Add and edit product forms with validation.
- Convert a price entered as rupees and paisa into integer minor units exactly before sending; make the form label unambiguous. Display the stored minor-unit value as PKR.
- Activate/deactivate products using the supported update operation.
- Use designed fallbacks for missing image URLs. Do not depend on stock imagery or introduce an upload flow the backend does not have.

### 6. Sales representatives
- List reps, showing identity and active state.
- Create a rep with the fields required by the API.
- Activate/deactivate using the status endpoint, with confirmation for deactivation.
- Show assigned-shop counts only if you can derive them reliably from actual data; otherwise do not fabricate them.
- Do not present password reset, deletion, or role editing if the backend has no endpoint for them.

### 7. Reports
Build a useful analytics area with shared date, rep, and shop filters where supported:
- Delivered sales trend by UTC day.
- Top products by delivered boxes and delivered sales value.
- Shops ranked by delivered sales value.
- Drill into a shop to see products delivered to that shop.
- Rep leaderboard by delivered sales value, delivered order count, and distinct shops served according to the API.
- Clear chart axes, PKR formatting, box counts, tooltips, and accompanying accessible tables or lists.
- A report should update after a real partial delivery. Four delivered juice boxes must be counted, even when six were ordered.
- Empty periods should show a thoughtful “No deliveries in this range” state, not a broken chart or fake numbers.

If adding CSV export is easy and uses the currently loaded real report data, it is optional. Complete all core flows before spending time on exports.

## Visual design direction

The web app should look like the desktop counterpart of the React Native app’s **Fieldnote** identity. Inspect the mobile project if it is available and borrow its actual colors, typography, logo treatment, and status language. If it is unavailable, establish a coherent visual system that the mobile app can later align with.

Make it distinctive, sleek, elegant, and convincing in a client presentation:
- A warm ivory or subtle stone canvas, deep ink/navy typography, and a restrained citrus or terracotta accent.
- Intentional typography scale, generous spacing, clear information density, and polished tables.
- A memorable but subtle visual motif inspired by field routes, order slips, or shop visits.
- A refined navigation rail/sidebar, excellent page headers, and contextual actions.
- Status treatments that remain readable and consistent throughout.
- Thoughtful chart styling, table row interactions, filters, drawers/dialogs, and confirmation states.
- Smooth, restrained transitions. Visual polish must not slow order processing.
- Responsive desktop and tablet layouts, with a usable narrow viewport.
- Full keyboard usability, visible focus states, semantic controls, readable contrast, and clear form errors.

Do not ship a default template dashboard with unrelated icons, placeholder charts, fake KPIs, or ClickUp remnants. Do not put implementation details such as raw DTO names in the user-facing UI.

Create reusable design tokens and components for page layouts, buttons, fields, tables, filters, dialogs, status badges, loading states, and empty states. Use the existing styling/component system where it is sound; replace it only when necessary for a coherent result.

## App quality and engineering

- Follow the repo’s existing Next.js router and conventions unless there is a concrete reason to change them.
- Use TypeScript types generated from or carefully aligned with the OpenAPI contract.
- Keep transport/API code separate from presentation components.
- Centralize PKR minor-unit formatting, UTC date formatting, status labels, and backend error mapping.
- Validate forms on the client while letting the backend remain authoritative.
- Show loading skeletons, empty states, retry actions, mutation progress, success feedback, and conflict handling.
- Preserve pagination and filters in the URL where useful, so refresh/back navigation works.
- Prevent duplicate mutation clicks.
- Invalidate or refetch affected data after accepting, delivering, cancelling, assigning, or updating records.
- Do not persist sensitive information in browser storage or commit actual `.env` values.
- Provide `.env.example` with the backend origin and clear README instructions.
- Do not add a separate database or duplicate NestJS business rules in Next.js.

## Implementation order

Keep the app runnable as you progress:

1. Inspect and protect/push the old frontend branch.
2. Inspect the backend contract and verify the API/seeded environment.
3. Remove ClickUp business features while retaining useful architecture.
4. Build the design system and admin shell.
5. Implement secure login/session and protected admin access.
6. Implement order queue, order detail, accept/cancel/delivery flow.
7. Implement shops, products, and reps.
8. Implement dashboard and reports using real data.
9. Polish responsive states and interactions.
10. Run integration tests and the live demo scenario; commit and push the new feature branch.

Prioritize a reliable order lifecycle and real reports before optional enhancements. If something is ambiguous, inspect the actual backend response, make a reasonable documented choice, and continue.

## Verification and acceptance

Do not say the task is complete until:

1. The app starts locally with exact documented commands.
2. The seeded admin can log in, and a rep account cannot access admin operations.
3. The dashboard and reports use real backend data.
4. An order submitted from the React Native app or directly through the real API becomes visible in the web order queue.
5. The admin can accept, partially deliver, and cancel eligible orders with the correct validation and status transitions.
6. The 4-biscuit / 6-juice example can be fulfilled as 4 biscuits / 4 juices. The order displays both requested and delivered quantities, and reports count only the delivered boxes.
7. The admin can create/update products, create/update shops, assign/reassign shops, and create/activate/deactivate reps through the real API.
8. The main screens have been visually reviewed at desktop and narrow widths. Fix overflow, clipped dialogs, awkward empty states, and inconsistent spacing.
9. Type checking, linting, build, and relevant integration or UI tests pass.
10. No ClickUp links, labels, routes, API calls, or assets remain in the finished user experience.
11. The original ClickUp branch has been preserved and pushed if a remote was available; the completed field-sales feature branch is committed and pushed.

At the end, give me:
- The original backup branch and commit, and whether it was pushed.
- The new feature branch and commit, and whether it was pushed.
- What architecture was retained and which ClickUp-specific features were removed.
- Exact environment and startup instructions.
- Pages and backend endpoints implemented.
- Tests and live browser flows you actually ran, with results.
- Any remaining API mismatch or incomplete item.
- A concise Saturday client-demo walkthrough for the admin web app.