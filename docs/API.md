# API Reference

Base URL: `http://localhost:4000`

## Health

- `GET /api/health`

## Auth

- `POST /api/auth/register`
  - Body: `{ email, password, firstName, lastName }`
- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Sets an HttpOnly session cookie.
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`

## Catalog

- `GET /api/products`
  - Query: `categoryId`, `minPrice`, `maxPrice`, `brand`, `sort`, `page`, `pageSize`
- `GET /api/products/:id`
- `GET /api/categories`

## Cart And Coupons

- `GET /api/cart`
- `POST /api/cart/items`
  - Body: `{ productId, quantity }`
- `PATCH /api/cart/items/:productId`
  - Body: `{ quantity }`
- `DELETE /api/cart/items/:productId`
- `DELETE /api/cart`
- `POST /api/cart/coupon`
  - Body: `{ code }`
- `DELETE /api/cart/coupon`

## Events And Trending

- `POST /api/events/view`
- `POST /api/events/add-to-cart`
- `POST /api/events/purchase`
  - Body: `{ productId, quantity? }`
- `GET /api/trending`
  - Query: `window=1h|24h`, `limit`, `categoryId`

## Search

- `GET /api/search`
  - Query: `q`, `categoryId`, `minPrice`, `maxPrice`, `minRating`, `sort`, `page`, `pageSize`
- `GET /api/search/suggest?q=lap`
- `GET /api/search/facets`

## Checkout And Orders

- `POST /api/checkout`
  - Header: `Idempotency-Key`
  - Body: `{ shippingAddress?: { name, phone, street, city, postalCode } }`
- `GET /api/orders`
- `GET /api/orders/:id`

## Recommendations

- `GET /api/recommendations?limit=8`

## Agentic Search

- `POST /api/agentic-search`
  - Body: `{ "query": "budget gaming laptops under 60000 with good ratings" }`
  - Response includes `query`, `intent`, `plan`, `filters`, `generatedSearchQuery`, `source`, `total`, and `results`.

## Rate Limits

- Login: 5 requests / 15 minutes per email+IP.
- Search and suggestions: 60 requests / minute per IP.
- Checkout: 10 requests / minute per user.
- Recommendations: 60 requests / minute per user/IP.

All limited responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.
