# Valkey Data Structure Usage

## Strings

- `session:{token}` stores user ID with TTL.
- `user_email:{email}` maps email to user ID.
- `cart_coupon:{userId}` stores the applied coupon.
- `idempotency:{userId}:{key}` stores checkout response for 24 hours.
- `login_attempts:{email}:{ip}` stores failed login counters.

## Hashes

- `cart:{userId}` maps product ID to quantity.
- `inventory:{productId}` stores `quantity` and `reserved` for stock checks.

## JSON Or String Fallback

- `user:{id}`
- `product:{id}`
- `category:{id}`
- `coupon:{code}`
- `order:{id}`

When Valkey JSON is available, documents use `JSON.SET` and `JSON.GET`. Otherwise they use `SET` and `GET` with serialized JSON.

## Sets

- `products:all`
- `categories:all`
- `coupons:all`
- `users:all`
- `orders:all`

These support fallback scans when modules are unavailable.

## Sorted Sets

- `trending:global:1h:{hourEpoch}`
- `trending:global:24h:{dayEpoch}`
- `trending:category:{categoryId}:1h:{hourEpoch}`
- `trending:category:{categoryId}:24h:{dayEpoch}`
- `{actorId}:viewed_products`
- `{actorId}:cart_adds`
- `{actorId}:purchases`
- `{actorId}:viewed_categories`
- `orders:user:{userId}`

Trending weights:

- View: `1`
- Add to cart: `3`
- Purchase: `8`

## Search

- `idx:products` is created when Valkey Search is available.
- `autocomplete` is populated with product names when suggestions are available.
- If Search is unavailable, `/api/search` scans `products:all` and applies the same filters in application code.

## Rate Limiting

- `ratelimit:fixed:{scope}:{bucket}` stores fixed-window counters with expiry.

The middleware emits `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.
