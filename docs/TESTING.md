# Testing Guide

## Backend

```bash
cd backend
npm test
```

The test command sets `ALLOW_MEMORY_STORE=true`, so tests run even when Docker is unavailable.

Covered scenarios:

- Auth success/failure/duplicate/protected routes.
- Product list/detail/filter/pagination/invalid ID.
- Cart add/update/remove/coupon success and failures.
- Trending score weights and ranking.
- Search, autocomplete, recommendations, and agentic search.
- Checkout success, duplicate idempotency key, empty cart, and insufficient stock.

## Frontend

```bash
cd frontend
set CI=true
npm test -- --watchAll=false
npm run build
```

The Jest setup mocks carousel internals and hardens Select2 initialization for the template headers.

## Manual Smoke

1. Start backend and frontend.
2. Log in at `/account`.
3. Use `/shop` agentic search.
4. Add a product to cart.
5. Apply `VALKEY10`.
6. Checkout and confirm the order success message.
