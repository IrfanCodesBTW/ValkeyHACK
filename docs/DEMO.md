# Demo Walkthrough

## Setup

1. Start Valkey with `valkey/valkey-bundle:9-alpine`.
2. Run `npm install` in `backend` and `frontend`.
3. Run `npm run seed` in `backend`.
4. Start backend: `npm start`.
5. Start frontend: `npm start`.

If Docker is not available, start backend with `ALLOW_MEMORY_STORE=true`.

## Presentation Flow

1. Open `/account`.
2. Log in with `demo@valkey.local` / `ValkeyDemo123`.
3. Open `/shop`.
4. Show catalog pagination, category filtering, and price sorting.
5. Run agentic search: `budget gaming laptops under 60000 with good ratings`.
6. Explain the returned plan and filters.
7. Open the Acer Nitro product detail page.
8. Add it to cart.
9. Open `/cart`, apply `VALKEY10`, and show subtotal, discount, total.
10. Open `/checkout`, submit the order, and show the confirmed order ID.
11. Return to `/` and show Trending Now and Recommended For You.

## Talking Points

- Sessions are stored in Valkey strings with TTL.
- Cart uses Valkey hashes.
- Trending and recommendations use sorted sets.
- Coupons and products prefer Valkey JSON, with string fallback.
- Search prefers Valkey Search, with deterministic app-level fallback.
- Checkout uses inventory keys and idempotency keys to prevent duplicate orders.
- Agentic search works without API keys through a deterministic parser.
