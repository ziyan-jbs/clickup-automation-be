# Field Sales API

NestJS/PostgreSQL backend for food-distributor sales reps to take box-quantity orders and for admins to process delivery. Values are integer minor PKR units (`45000` means PKR 450.00), never floats.

## Start the demo

```bash
cp .env.example .env.development
docker compose up --build -d
npm run migration:run
npm run seed
npm run start:dev
```

The API is at `http://localhost:4000`, health is `/health`, and Swagger is `http://localhost:4000/docs`. Use a real `JWT_ACCESS_SECRET` outside development. The repeatable seed command reads `DEMO_PASSWORD` from `.env.development`.

Seeded logins use that configured password (default `DemoPass123!`):

- `admin@demo.test` — admin
- `rep.ali@demo.test` — sales representative
- `rep.sara@demo.test` — sales representative

## API flow

1. `POST /api/auth/login`, then send `Authorization: Bearer <accessToken>`.
2. Admin manages products, shops, and assignments; reps use `GET /api/shops` and `GET /api/products`.
3. Rep submits `POST /api/orders` with a client-generated `idempotencyKey`. Duplicate product lines are merged; price, totals, status, and rep identity are all server-derived.
4. Admin accepts with `PATCH /api/orders/:id/accept`, then finalizes all line quantities through `PATCH /api/orders/:id/delivery`. Zero delivery requires cancellation with a reason.
5. Admin views `/api/reports/dashboard`, `/products`, `/shops`, `/shops/:id/products`, `/reps`, and `/trend`. Delivered metrics use completion date and only delivered quantities.

Example order body:

```json
{
  "shopId": "shp_...",
  "idempotencyKey": "mobile-uuid-or-unique-key",
  "notes": "Deliver after 3pm",
  "lines": [{ "productId": "prd_...", "orderedBoxes": 6 }]
}
```

## Rules and scope

- `ADMIN` and `SALES_REP` roles; inactive users cannot authenticate.
- Reps only see/order active shops currently assigned to them; each order preserves its original rep.
- `SUBMITTED → ACCEPTED → DELIVERED | PARTIALLY_DELIVERED`; `SUBMITTED | ACCEPTED → CANCELLED`.
- Finalized orders/snapshots are immutable. Corrections, proposed shops, visits, payments, stock, and notifications are intentionally P1/out of scope.

## Checks

```bash
npm run build
npm run check
npm test
```
