# Field Sales API

NestJS and PostgreSQL backend for a food distributor. Sales representatives take orders in boxes; admins confirm available quantities and sales reps record pickup and delivery. Money is integer PKR minor units: `72000` means PKR 720.00 per box.

## Run the demo

The original ClickUp scaffold is preserved at commit `1e895f6` on `main`. The field-sales work is on `feature/field-sales-demo`. NestJS, TypeORM, migrations, Docker/PostgreSQL, validation, and request IDs were reused. The old ClickUp entities, routes, Redis integration, token encryption, scheduling utilities, and ClickUp configuration were removed.

Set `JWT_ACCESS_SECRET` and `DEMO_PASSWORD` in `.env.development`. If that file is missing, copy `.env.example` to `.env.development` first. Then run:

```bash
docker compose up --build -d
docker compose exec -T api npm run migration:run
docker compose exec -T api npm run seed
docker compose ps
```

The API runs in Docker at `http://localhost:4000/api`. Health is `http://localhost:4000/health`; Swagger is `http://localhost:4000/docs` and OpenAPI JSON is `/docs-json`. The container starts the API automatically.

Seed logins use the `DEMO_PASSWORD` in `.env.development`:

| Email | Role |
| --- | --- |
| `superadmin@demo.test` | `SUPER_ADMIN` |
| `admin@demo.test` | `ADMIN` |
| `rep.ali@demo.test` | `SALES_REP` |
| `rep.sara@demo.test` | `SALES_REP` |

The repeatable seed provides ten products, ten assigned shops, and orders in all demo statuses.
Reseeding the demo resets its ten catalog products to 1,000 available boxes each. On an existing database, migration starts other products at zero; enter their actual quantities before accepting orders.
Both admin roles can use the web app and create any number of sales rep accounts. Sales reps use the mobile app.

## API contract

Send `Authorization: Bearer <accessToken>` after `POST /api/auth/login`. Mutation bodies are JSON. Validation errors return 400; unauthorized and forbidden requests return 401 and 403; invalid transitions and reused idempotency keys with different content return 409. Error bodies contain `statusCode`, `message`, `requestId`, `path`, and `timestamp`.

| Area | Routes |
| --- | --- |
| Auth | `POST /api/auth/login`, `GET /api/auth/me` |
| Users (admin) | `GET/POST /api/users/sales-reps`, `PATCH /api/users/sales-reps/:id/status` (rep creation sets `requiresShopApproval`) |
| Products | `GET /api/products`, `GET /api/products/:id`; admin: `POST /api/products`, `PATCH /api/products/:id` |
| Shops | `GET /api/shops`, `GET /api/shops/:id`; rep: `POST /api/shops/requests`; admin: `POST /api/shops`, `PATCH /api/shops/:id`, `/assignment`, `/approval` |
| Orders | `GET /api/orders`, `GET /api/orders/:id`; rep: `POST /api/orders`; admin: `PATCH /api/orders/:id/accept`, `/cancel`; admin or assigned rep: `/pickup`; assigned rep: `/delivery` |
| Reports (admin) | `GET /api/reports/dashboard`, `/products`, `/shops`, `/shops/:id/products`, `/reps`, `/trend` |

Product, shop, and order lists return `{ "items": [...], "total": 10, "page": 1, "limit": 25 }`; `page` starts at 1 and `limit` can be 1–100. Products support `search` and `active` filters. Orders support `status`, `shopId`, `repId` (admin only), `from`, and `to`. Reps see only active products, their current active shops, and orders they submitted. Shop detail contains up to ten recent orders; a rep sees only their own orders there. Admins can deactivate reps, products, and shops through their update endpoints.

Swagger documents each success response separately. `POST /api/auth/login` returns a token and a user with timestamps; `GET /api/auth/me` returns the current user's ID, email, name, role, and active status. Order lists include shop and rep summaries; order detail and status actions also include lines and status events. Nullable fields such as shop contact details, assignment, and order delivery timestamps are present as `null` when unset. Shop write requests accept latitude and longitude as decimal strings or JSON numbers, plus `null` to clear them; database responses return coordinates as decimal strings or `null`. `assignedRepId` accepts a string or `null` on shop create/update. The dedicated assignment endpoint requires a rep ID string.

For an order, send a client-generated stable `idempotencyKey` (at most 100 characters) and reuse it when retrying the same submission:

```json
{
  "shopId": "shp_...",
  "idempotencyKey": "mobile-generated-uuid",
  "notes": "Deliver after 3pm",
  "lines": [
    { "productId": "prd_biscuits", "orderedBoxes": 4 },
    { "productId": "prd_juice", "orderedBoxes": 6 }
  ]
}
```

The server merges duplicate product lines and derives rep ID, prices, totals, and status. The returned order has `id`, `orderNumber`, `shopId`, `repId`, `status`, `currency`, `orderedTotalMinor`, `deliveredTotalMinor`, `lines`, and `statusEvents`. Lines include ordered and delivered boxes, product name/SKU/pack-size snapshots, unit price snapshot, and line totals. A retry with the same key and content returns the same order; changing content with that key returns 409.

The admin accepts with `PATCH /api/orders/:id/accept` and an `acceptedBoxes` value for every line ID. Each quantity must be between zero and the requested amount, and at least one box must be accepted. Acceptance checks and deducts `products.availableBoxes` atomically. Cancelling an accepted order before pickup restores those boxes. Product creation requires an initial available box count; admins can update it later.

```json
{ "lines": [{ "lineId": "lin_biscuits", "acceptedBoxes": 4 }, { "lineId": "lin_juice", "acceptedBoxes": 4 }] }
```

The admin or assigned rep marks pickup with `PATCH /api/orders/:id/pickup`. The assigned rep then records delivery with `PATCH /api/orders/:id/delivery`, sending every line ID with `deliveredBoxes` no greater than its accepted quantity. Full delivery means all requested boxes were delivered; otherwise the result is `PARTIALLY_DELIVERED`. Status moves through `SUBMITTED → ACCEPTED → PICKED_UP → DELIVERED | PARTIALLY_DELIVERED`. Admins can cancel submitted or accepted orders with a reason. Zero-box orders should be cancelled before pickup.

A sales rep sends full shop details to `POST /api/shops/requests`; the API assigns that shop to the rep. If `requiresShopApproval` is true (the default when an admin creates the rep), the shop remains pending and cannot receive orders until an admin approves it with `PATCH /api/shops/:id/approval` and `{ "approvalStatus": "APPROVED" }`. The admin can reject it with `REJECTED`. Reps allowed to add shops directly receive an active, approved shop immediately.

The admin can then read `/api/reports/dashboard` and `/api/reports/products`; the juice row counts four delivered boxes for this order. Ranked reports and trend return `{ "currency": "PKR", "dateBasis": "delivery completion UTC", "items": [...] }`. Reporting `from` and `to` are inclusive UTC calendar dates. Submitted counts and value use submission date and include orders even if their status has advanced; delivered metrics use delivery completion date and include only delivered quantities. Cancelled orders contribute no delivered value. Reports accept optional `repId` and `shopId` filters, and trend groups by UTC day.

## Verification

```bash
npm run check
npm run build
npm test -- --runInBand
docker compose exec -T api npm run test:e2e -- --runInBand
```

The end-to-end tests use PostgreSQL. Run the seed first: the OpenAPI contract test logs in with a seeded admin, compares the generated `/docs-json` success schemas with seeded responses and every mutation response, and removes its own records. The workflow test checks assignment, server pricing, retries, partial delivery, delivered reports, historical rep attribution after reassignment, and invalid transitions.

## Demo scope

The backend includes the P0 flow. A shop detail returns recent order history. Rep shop proposals, repeat-last-order, and visit outcomes remain P1. Inventory accounting, payments, invoicing, and notifications are outside this demo.
