# Requirements Document

## Introduction

This spec covers a major upgrade of the existing `valkey-ecommerce-demo` repository into a polished, production-style, end-to-end e-commerce demo built around Valkey for the **Build Beyond Limits** hackathon. The repository currently contains a React 18 (Create React App) frontend with pages for shop, product details, cart, checkout, account, wishlist, vendors, blog, and contact, plus a static documentation site. There is no backend yet.

The upgrade will:

1. Add a Node.js + Express backend that uses Valkey (via the `valkey-bundle` Docker image) as the primary datastore for sessions, catalog (Valkey JSON), carts (Hashes), trending (Sorted Sets), search (RediSearch / Valkey Search), inventory (Lua), rate limiting, recommendations, and an agentic natural-language search experience.
2. Wire the existing React frontend to the new backend so the end-to-end demo flows (login, browse, search, cart, checkout, trending, recommendations, agentic search) actually work.
3. Add seed data, a `.env.example`, a developer-friendly README, an API reference, and a demo walkthrough so the project is reproducible by judges in minutes.

The headline differentiator is **Agentic Search**: a natural-language query interface ("show me budget gaming laptops under 60000 with good ratings") that translates user intent into structured Valkey Search queries, with an LLM path when an API key is configured and a deterministic parser fallback otherwise.

This document captures functional requirements (one top-level requirement per feature area) and cross-cutting non-functional requirements (security, performance, observability, developer experience). All requirements use EARS patterns and follow INCOSE quality rules.

## Glossary

- **The_Backend**: The Node.js + Express HTTP server added in this upgrade, exposing the JSON REST API consumed by The_Frontend.
- **The_Frontend**: The existing React 18 Single-Page Application under `frontend/`, refactored to consume The_Backend.
- **The_Auth_Service**: The Backend module responsible for registration, login, logout, and session validation.
- **The_Catalog_Service**: The Backend module responsible for product and category storage and retrieval using Valkey JSON.
- **The_Cart_Service**: The Backend module responsible for shopping cart and coupon operations.
- **The_Trending_Service**: The Backend module responsible for tracking interaction events and computing trending products.
- **The_Search_Service**: The Backend module responsible for full-text product search, autocomplete, and faceted filtering using Valkey Search (RediSearch-compatible).
- **The_Checkout_Service**: The Backend module responsible for order placement, atomic inventory reservation via Lua, and idempotency.
- **The_Rate_Limiter**: The Backend middleware responsible for enforcing per-endpoint and per-client request limits.
- **The_Recommendation_Service**: The Backend module responsible for tracking per-user interaction signals and producing personalized product recommendations.
- **The_Agentic_Search_Service**: The Backend module responsible for translating natural-language search queries into structured Valkey Search queries.
- **The_LLM_Adapter**: The Backend module that wraps optional Gemini or Groq API calls with a uniform interface and a deterministic fallback path.
- **The_Seed_Script**: A standalone Node.js script that populates Valkey with realistic demo data (users, categories, products, coupons, optional ads).
- **Valkey**: The open-source in-memory datastore (running via the `valkey-bundle:9-alpine` Docker image) used as the primary datastore for The_Backend.
- **Session_Token**: A server-generated opaque string used as the value of the `session` HTTP cookie and as the key suffix for the corresponding Valkey session entry.
- **Idempotency_Key**: A client-supplied opaque string sent in the `Idempotency-Key` HTTP header to deduplicate checkout requests.
- **API_Key**: A secret value loaded from environment variables (e.g. `GEMINI_API_KEY`, `GROQ_API_KEY`) used by The_LLM_Adapter.
- **UUIDv7_ID**: An identifier in the format `{domain}:{uuidv7}` (e.g. `product:0192d4e6-2c4e-7a6b-8d8f-0a1b2c3d4e5f`) as defined in `HACKATHON.md`.

## Requirements

### Requirement 1: User Authentication

**User Story:** As a shopper, I want to register, log in, log out, and have my session validated, so that I can access account-specific features (cart, checkout, recommendations) safely.

#### Acceptance Criteria

1. WHEN a registration request is received with a valid email and a password of at least 8 characters, THE The_Auth_Service SHALL hash the password using bcrypt with a cost factor of at least 12, store the user JSON document via `JSON.SET` under key `user:{uuidv7}`, and respond with HTTP 201 and the created user's public profile.
2. IF a registration request is received with an email that already exists in Valkey, THEN THE The_Auth_Service SHALL respond with HTTP 409 and SHALL NOT modify any user record.
3. IF a registration request is received with an email that fails RFC 5322 validation or a password shorter than 8 characters, THEN THE The_Auth_Service SHALL respond with HTTP 400 and SHALL NOT create a user record.
4. WHEN a login request is received with an email and password that match a stored bcrypt hash, THE The_Auth_Service SHALL generate a Session_Token, store it via `SET session:{token} {userId} EX 86400`, set an `HttpOnly` `Secure`-eligible session cookie, and respond with HTTP 200.
5. IF a login request is received with credentials that do not match a stored user, THEN THE The_Auth_Service SHALL respond with HTTP 401, SHALL NOT issue a session, and SHALL increment a failed-attempt counter via `INCR login_attempts:{email}` followed by `EXPIRE login_attempts:{email} 900`.
6. IF the failed-attempt counter for a given email reaches 5 within a 15-minute window, THEN THE The_Auth_Service SHALL respond with HTTP 429 to subsequent login attempts for that email until the counter expires.
7. WHEN a logout request is received from an authenticated client, THE The_Auth_Service SHALL execute `DEL session:{token}`, clear the session cookie, and respond with HTTP 204.
8. WHEN any authenticated request is received, THE The_Auth_Service SHALL retrieve the user ID via `GET session:{token}`, refresh the TTL via `EXPIRE session:{token} 86400`, and reject the request with HTTP 401 if the key is absent.
9. THE The_Auth_Service SHALL NOT include password hashes, internal user IDs other than the public UUIDv7, or session tokens in any HTTP response body.

### Requirement 2: Product Catalog

**User Story:** As a shopper, I want to browse a catalog of realistic products organized by category with pagination, filtering, and detail views, so that I can find items I am interested in.

#### Acceptance Criteria

1. THE The_Catalog_Service SHALL store every product as a JSON document under key `product:{uuidv7}` using `JSON.SET`, conforming to the product contract defined in `HACKATHON.md`.
2. THE The_Catalog_Service SHALL store every category as a JSON document under key `category:{uuidv7}` using `JSON.SET`, supporting at least two levels of parent/child nesting.
3. WHEN a `GET /api/products` request is received with optional `categoryId`, `minPrice`, `maxPrice`, `brand`, `page`, and `pageSize` query parameters, THE The_Catalog_Service SHALL return matching products as a JSON array along with `total`, `page`, and `pageSize` fields.
4. WHEN a `GET /api/products/:id` request is received with an existing product UUIDv7_ID, THE The_Catalog_Service SHALL return the full product JSON document with HTTP 200.
5. IF a `GET /api/products/:id` request is received for an ID that does not exist in Valkey, THEN THE The_Catalog_Service SHALL respond with HTTP 404.
6. WHEN a `GET /api/categories` request is received, THE The_Catalog_Service SHALL return the full category tree as a nested JSON structure with HTTP 200.
7. THE The_Seed_Script SHALL populate Valkey with at least 8 categories (covering at least 2 root categories with children) and at least 40 products distributed across those categories, with realistic names, prices, brands, ratings, and image URLs.
8. WHEN paginated product listing responses are returned, THE The_Catalog_Service SHALL produce results consistent with the `pageSize` parameter such that `pageSize` is clamped to the inclusive range [1, 100].

### Requirement 3: Shopping Cart and Coupons

**User Story:** As a shopper, I want to add items to a cart, change quantities, remove items, and apply coupon codes, so that I can prepare an order with the correct totals before checkout.

#### Acceptance Criteria

1. WHEN a `POST /api/cart/items` request is received from an authenticated client with a valid product ID and a positive integer quantity, THE The_Cart_Service SHALL execute `HSET cart:{userId} {productId} {quantity}` and respond with HTTP 200 and the updated cart.
2. WHEN a `PATCH /api/cart/items/:productId` request is received with a positive integer quantity, THE The_Cart_Service SHALL set the field value via `HSET` and respond with HTTP 200 and the updated cart.
3. WHEN a `DELETE /api/cart/items/:productId` request is received, THE The_Cart_Service SHALL execute `HDEL cart:{userId} {productId}` and respond with HTTP 200 and the updated cart.
4. WHEN a `DELETE /api/cart` request is received, THE The_Cart_Service SHALL execute `DEL cart:{userId}` and respond with HTTP 204.
5. WHEN a `GET /api/cart` request is received, THE The_Cart_Service SHALL execute `HGETALL cart:{userId}`, hydrate each entry with the corresponding product JSON via `JSON.GET`, compute `subtotal`, `discount`, and `total`, and respond with HTTP 200 and the hydrated cart payload.
6. THE The_Cart_Service SHALL store every coupon as a JSON document under key `coupon:{code}` using `JSON.SET`, with fields `code`, `type` (`percentage` or `fixed`), `value`, `minOrderAmount`, `maxDiscount`, `validFrom`, `validUntil`, `usageLimit`, `usedCount`, and `active`.
7. WHEN a `POST /api/cart/coupon` request is received with a code that exists, is `active`, has `validFrom` ≤ current time ≤ `validUntil`, has `usedCount` < `usageLimit`, and the cart subtotal ≥ `minOrderAmount`, THE The_Cart_Service SHALL apply the discount according to `type` and `value`, capped at `maxDiscount` for percentage coupons, and respond with HTTP 200 and the updated totals.
8. IF a `POST /api/cart/coupon` request is received with a code that is missing, expired, inactive, exceeds its usage limit, or fails the minimum order threshold, THEN THE The_Cart_Service SHALL respond with HTTP 400 and a machine-readable `error.code` value identifying the specific reason.
9. IF a `POST /api/cart/items` or `PATCH /api/cart/items/:productId` request is received with a quantity less than 1 or greater than the product's available inventory (`inventory.quantity - inventory.reserved`), THEN THE The_Cart_Service SHALL respond with HTTP 400 and SHALL NOT modify the cart.
10. WHEN a `POST /api/cart/merge` request is received from a newly authenticated client carrying a guest session ID, THE The_Cart_Service SHALL combine the contents of `cart:guest:{sessionId}` into `cart:{userId}` by summing quantities per product, delete the guest cart, and respond with HTTP 200 and the merged cart.

### Requirement 4: Trending Products

**User Story:** As a shopper, I want to see the products that other shoppers are currently viewing, adding to cart, and buying, so that I can discover popular items.

#### Acceptance Criteria

1. WHEN a `POST /api/events/view` request is received with a product ID, THE The_Trending_Service SHALL execute `ZINCRBY trending:global:1h 1 {productId}` and `ZINCRBY trending:global:24h 1 {productId}`.
2. WHEN a `POST /api/events/add-to-cart` request is received with a product ID, THE The_Trending_Service SHALL execute `ZINCRBY trending:global:1h 3 {productId}` and `ZINCRBY trending:global:24h 3 {productId}`.
3. WHEN a `POST /api/events/purchase` request is received with a product ID and quantity, THE The_Trending_Service SHALL execute `ZINCRBY trending:global:1h 5 {productId}` and `ZINCRBY trending:global:24h 5 {productId}` once per product line item.
4. THE The_Trending_Service SHALL maintain hourly trending buckets under keys `trending:global:1h:{hourEpoch}` and daily trending buckets under keys `trending:global:24h:{dayEpoch}`, each with `EXPIRE` set to twice the bucket window.
5. WHEN a `GET /api/trending?window=1h&limit=N` request is received, THE The_Trending_Service SHALL execute `ZREVRANGE` with `WITHSCORES` over the requested window key, hydrate each member's product JSON, and respond with HTTP 200 and an ordered list of length min(N, 50).
6. WHEN a `GET /api/trending?categoryId={id}` request is received, THE The_Trending_Service SHALL operate against the per-category sorted-set keys `trending:category:{categoryId}:{window}` using the same scoring and time-window semantics.
7. THE The_Trending_Service SHALL apply weights such that purchase weight > add-to-cart weight > view weight in every trending bucket update.

### Requirement 5: Full-Text Search

**User Story:** As a shopper, I want to type keywords and see matching products with autocomplete, faceted filters, and sortable results, so that I can locate products quickly.

#### Acceptance Criteria

1. WHEN The_Backend starts and the Valkey Search module is available, THE The_Search_Service SHALL execute `FT.CREATE idx:products ON JSON PREFIX 1 product:` with schema fields covering at minimum `name TEXT WEIGHT 5.0`, `description TEXT WEIGHT 1.0`, `brand TEXT SORTABLE`, `categoryId TAG`, `tags TAG SEPARATOR ","`, `price NUMERIC SORTABLE`, and `rating NUMERIC SORTABLE`.
2. IF The_Backend starts and the Valkey Search module is not available, THEN THE The_Search_Service SHALL log a clearly-marked warning, fall back to an in-process scan-and-filter implementation that supports at least case-insensitive substring matching on `name` and `description`, and continue to serve the same `/api/search*` endpoints.
3. WHEN a `GET /api/search?q={query}&category={id}&minPrice={n}&maxPrice={n}&minRating={n}&sort={field_dir}&page={n}&pageSize={n}` request is received, THE The_Search_Service SHALL translate the parameters into a single `FT.SEARCH` invocation (or its fallback equivalent) and respond with HTTP 200 carrying `{ query, total, page, pageSize, results, facets }`.
4. WHEN search results are returned, THE The_Search_Service SHALL include facet aggregations for `categories`, `brands`, and `priceRanges`, each as an array of `{ key, count }` entries computed against the filtered result set.
5. WHEN a `GET /api/search/suggest?q={prefix}` request is received with a prefix of length ≥ 1, THE The_Search_Service SHALL respond with HTTP 200 and up to 10 suggestions sourced from `FT.SUGGET autocomplete {prefix} FUZZY MAX 10` (or its fallback equivalent).
6. WHEN a `GET /api/search` request includes `sort` set to one of `relevance`, `price_asc`, `price_desc`, `rating_desc`, or `newest`, THE The_Search_Service SHALL apply the corresponding `SORTBY` clause (or fallback ordering) and respond with results in that order.
7. IF a `GET /api/search` request produces zero matches, THEN THE The_Search_Service SHALL respond with HTTP 200, an empty `results` array, a `total` of 0, and a non-empty `suggestions` array of up to 5 alternative terms drawn from `FT.SUGGET autocomplete` (or its fallback equivalent).
8. WHEN seed data is loaded, THE The_Seed_Script SHALL register every product name into the `autocomplete` suggester via `FT.SUGADD` with a baseline score, when the Valkey Search module is available.

### Requirement 6: Checkout and Inventory

**User Story:** As a shopper, I want to place an order knowing that stock will be reserved atomically and that I will not be charged twice if I retry, so that I can complete a purchase reliably.

#### Acceptance Criteria

1. WHEN a `POST /api/checkout` request is received from an authenticated client with a non-empty cart, THE The_Checkout_Service SHALL evaluate a single Lua script via `EVALSHA` (loaded once with `SCRIPT LOAD`) that, for each cart line, atomically verifies that `inventory.quantity - inventory.reserved ≥ requestedQuantity` and decrements the available count.
2. IF the Lua reservation script reports insufficient stock for any cart line, THEN THE The_Checkout_Service SHALL undo every decrement performed within the same script invocation, respond with HTTP 409, and return a body listing each offending `productId` and the available quantity.
3. WHEN a checkout request includes an `Idempotency-Key` header AND a prior request from the same user with the same key has already produced an order within the last 24 hours, THE The_Checkout_Service SHALL return the original order response with HTTP 200 and SHALL NOT reserve inventory a second time.
4. WHEN inventory reservation succeeds, THE The_Checkout_Service SHALL persist an order JSON document under key `order:{uuidv7}` via `JSON.SET`, append the order ID to `orders:user:{userId}` via `ZADD` with the order timestamp as score, and emit a `purchase` event per line item to The_Trending_Service.
5. WHEN an order is persisted successfully, THE The_Checkout_Service SHALL clear the user's cart via `DEL cart:{userId}` and respond with HTTP 201 and the created order body.
6. IF order persistence fails after inventory reservation succeeds, THEN THE The_Checkout_Service SHALL execute the inverse Lua script to release the reserved quantities and respond with HTTP 500.
7. THE The_Checkout_Service SHALL NOT permit any client to place a checkout request with an empty cart, and SHALL respond with HTTP 400 in that case.

### Requirement 7: Rate Limiting

**User Story:** As a platform operator, I want every public endpoint to be protected by configurable rate limits, so that abusive clients cannot degrade the demo.

#### Acceptance Criteria

1. THE The_Rate_Limiter SHALL be implemented as reusable Express middleware that accepts a configuration object with at least `algorithm` (`sliding_window` or `token_bucket`), `limit`, `windowSeconds`, and `keyResolver`.
2. THE The_Rate_Limiter SHALL implement the sliding-window algorithm via a single Lua script using a Sorted Set keyed by client identifier and timestamp members, executed via `EVALSHA`.
3. THE The_Rate_Limiter SHALL implement the token-bucket algorithm via a single Lua script that updates a Hash carrying `tokens` and `lastRefillMs` fields, executed via `EVALSHA`.
4. WHEN any rate-limited request is processed, THE The_Rate_Limiter SHALL set the response headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` (Unix epoch seconds) on every outcome, including allowed requests.
5. IF a request exceeds its configured limit, THEN THE The_Rate_Limiter SHALL respond with HTTP 429, set `Retry-After` to the number of seconds until the next token is available, and SHALL NOT invoke the downstream handler.
6. THE The_Backend SHALL apply The_Rate_Limiter to at minimum: `POST /api/auth/login` (5 req / 15 min per email+IP), `GET /api/search` and `GET /api/search/suggest` (60 req / min per IP), `POST /api/checkout` (10 req / min per user), and `GET /api/recommendations` (60 req / min per user).
7. THE The_Rate_Limiter SHALL load all per-endpoint configuration from environment variables or a single config module, with no hardcoded literals inside the route handlers.

### Requirement 8: Real-time Recommendations

**User Story:** As a shopper, I want to see recommendations that reflect what I have viewed, added to cart, and purchased, so that the demo feels personalized.

#### Acceptance Criteria

1. WHEN any user (authenticated or anonymous via session ID) views a product, THE The_Recommendation_Service SHALL execute `ZINCRBY user:{userId}:viewed_products 1 {productId}` and `ZINCRBY user:{userId}:viewed_categories 1 {categoryId}`.
2. WHEN a user adds a product to the cart, THE The_Recommendation_Service SHALL execute `ZINCRBY user:{userId}:cart_adds 1 {productId}` and update the corresponding category counter.
3. WHEN a user completes a purchase, THE The_Recommendation_Service SHALL execute `ZINCRBY user:{userId}:purchases 1 {productId}` for every line item.
4. THE The_Recommendation_Service SHALL set an `EXPIRE` of 30 days on every per-user signal sorted set on first write.
5. WHEN a `GET /api/recommendations?limit=N` request is received, THE The_Recommendation_Service SHALL compute a candidate set of products by reading the user's top categories and excluding products the user has already purchased, score candidates with weights view < cart < purchase, and respond with HTTP 200 and an ordered list of length min(N, 24).
6. WHERE the `GEMINI_API_KEY` or `GROQ_API_KEY` environment variable is set, THE The_Recommendation_Service SHALL invoke The_LLM_Adapter to optionally re-rank or annotate the candidate set with short rationales, and SHALL include the rationales in the response.
7. IF no LLM API key is configured OR The_LLM_Adapter call fails, THEN THE The_Recommendation_Service SHALL return the deterministic candidate ordering and SHALL NOT raise an error to the client.
8. WHEN a `GET /api/recommendations` request is received from an anonymous client identified only by session ID, THE The_Recommendation_Service SHALL serve recommendations using the session-scoped signal keys `session:{sessionId}:viewed_products`, `session:{sessionId}:cart_adds`, and `session:{sessionId}:viewed_categories`.

### Requirement 9: Agentic Search

**User Story:** As a shopper, I want to type a natural-language query like "show me budget gaming laptops under 60000 with good ratings" and get the right products with an explanation of how my query was interpreted, so that I can search the way I think.

#### Acceptance Criteria

1. WHEN a `POST /api/agentic-search` request is received with a JSON body `{ "query": string }` of length 3..512, THE The_Agentic_Search_Service SHALL produce a structured query plan containing at minimum `keywords`, `categoryFilter`, `priceRange`, `minRating`, and `sort`, then translate the plan into a single `FT.SEARCH` invocation against `idx:products`.
2. WHERE either `GEMINI_API_KEY` or `GROQ_API_KEY` is set, THE The_Agentic_Search_Service SHALL invoke The_LLM_Adapter to generate the structured query plan, validate the LLM response against a JSON schema, and reject any plan whose fields fall outside their declared domains.
3. IF no LLM API key is configured OR the LLM call fails OR the LLM response fails schema validation, THEN THE The_Agentic_Search_Service SHALL fall back to a deterministic rule-based parser that extracts keywords, recognizes price phrases ("under N", "below N", "between N and M"), recognizes rating phrases ("good ratings", "4 stars and up"), recognizes category synonyms from a static map, and returns a valid query plan.
4. WHEN the structured query plan has been computed, THE The_Agentic_Search_Service SHALL respond with HTTP 200 and a body of shape `{ query, plan, results, total, source }` where `source` is exactly one of `"llm"` or `"deterministic"`.
5. WHEN agentic search responds, THE The_Agentic_Search_Service SHALL include a human-readable `plan.explanation` string of at most 280 characters describing how the input was interpreted.
6. IF the input query length is outside the range 3..512 characters, THEN THE The_Agentic_Search_Service SHALL respond with HTTP 400 and SHALL NOT invoke The_LLM_Adapter or `FT.SEARCH`.
7. THE The_Agentic_Search_Service SHALL set a server-side timeout of 4000 ms on any LLM call and SHALL fall back to the deterministic parser when the timeout elapses.

### Requirement 10: Code Quality and Architecture

**User Story:** As a maintainer, I want the backend code to follow a clear modular layout with no hardcoded secrets, so that the project is easy to read, extend, and review.

#### Acceptance Criteria

1. THE The_Backend SHALL be organized into the directories `src/routes`, `src/controllers`, `src/services`, `src/repositories`, `src/middleware`, `src/scripts` (Lua), `src/lib`, and `src/config`, with each layer importing only from layers strictly below it.
2. THE The_Backend SHALL load every external configuration value (Valkey connection URL, port, JWT/session secret, LLM API keys, rate-limit defaults) exclusively via `process.env` through a single `src/config/index.js` module.
3. THE repository SHALL contain a `.env.example` file at the backend root listing every environment variable the backend reads, with placeholder (non-secret) values and inline comments.
4. THE The_Backend SHALL register a single Express error-handling middleware that converts thrown errors into a consistent JSON shape `{ error: { code, message, details? } }` and assigns appropriate HTTP status codes.
5. THE The_Backend SHALL validate every request body, query parameter, and path parameter against a declared schema (e.g. Zod or Joi) before invoking controller logic, and SHALL respond with HTTP 400 on validation failure with a structured `details` array.
6. THE The_Backend SHALL use `async`/`await` for all asynchronous control flow and SHALL NOT contain any unhandled-promise patterns.
7. IF any source file contains a literal value matching the patterns `sk-`, `AKIA`, `BEGIN PRIVATE KEY`, a hardcoded password, or a hardcoded API key, THEN the build SHALL fail via a pre-commit or CI check.

### Requirement 11: Developer Experience and Demo Readiness

**User Story:** As a hackathon judge or new contributor, I want to clone the repo, run a small number of well-documented commands, and see every feature working end to end, so that I can evaluate the project in minutes.

#### Acceptance Criteria

1. THE repository root SHALL contain an updated `README.md` describing prerequisites, the exact commands to start Valkey, install dependencies, seed the database, run the backend, and run the frontend.
2. THE The_Seed_Script SHALL be invocable via `npm run seed` from the backend directory, SHALL be idempotent (re-running it produces the same final dataset), and SHALL print a one-line summary of inserted entity counts on completion.
3. THE repository SHALL contain a top-level `docs/API.md` (or backend `README` section) listing every public endpoint with HTTP method, path, request schema, response schema, and applicable rate-limit configuration.
4. THE repository SHALL contain a top-level `docs/DEMO.md` walkthrough that lists, in order, the on-screen actions a presenter performs to exercise every feature area (auth, catalog, cart, coupon, trending, search, agentic search, checkout, recommendations) and the expected observable outcome of each step.
5. THE repository SHALL contain a top-level `docs/VALKEY-USAGE.md` that maps every Valkey data structure used (Strings, Hashes, JSON, Sorted Sets, Sets, RediSearch indexes, Lua scripts) to the feature that uses it and the keys it touches.
6. WHEN a developer runs the documented bootstrap command sequence on a clean machine with Docker, Node.js ≥ 18, and npm, THE end-to-end demo SHALL be reachable in the browser within 5 minutes of starting, with seeded data visible on the home page.
7. THE The_Backend SHALL emit structured request logs (method, path, status, duration in ms, requestId) to standard output for every HTTP request.
8. THE The_Backend SHALL expose a `GET /api/health` endpoint that returns HTTP 200 with `{ status: "ok", valkey: "connected" | "disconnected", search: "available" | "unavailable" }`.

### Requirement 12: Frontend Integration

**User Story:** As a shopper using the existing React UI, I want every interactive screen to be backed by the new backend rather than placeholder data, so that the demo flows from browse to checkout actually work.

#### Acceptance Criteria

1. THE The_Frontend SHALL read `REACT_APP_API_BASE_URL` from environment variables at build time and SHALL default to `http://localhost:4000` when unset.
2. THE The_Frontend SHALL include a single `src/api/client.js` module that wraps `fetch`, attaches credentials for cookie-based sessions, and centralizes error handling for non-2xx responses.
3. WHEN a shopper submits the login form on `AccountPage`, THE The_Frontend SHALL call `POST /api/auth/login` and SHALL navigate to `/` on HTTP 200 or display the backend's `error.message` on failure.
4. WHEN a shopper opens `ShopPage`, THE The_Frontend SHALL fetch products via `GET /api/products` with the active filters and SHALL render the response in place of any hardcoded product arrays.
5. WHEN a shopper opens `ProductDetailsPageOne` or `ProductDetailsPageTwo` for a specific product ID, THE The_Frontend SHALL fetch the product via `GET /api/products/:id` and SHALL emit a `POST /api/events/view` request once per page mount.
6. WHEN a shopper interacts with `CartPage`, THE The_Frontend SHALL call the corresponding `/api/cart*` endpoints for read, add, update quantity, remove, clear, and apply/remove coupon, and SHALL render the hydrated cart returned by the backend.
7. WHEN a shopper submits the checkout form on `CheckoutPage`, THE The_Frontend SHALL generate a UUIDv4 Idempotency_Key, send it in the `Idempotency-Key` header to `POST /api/checkout`, and SHALL display the returned order summary on success or the structured error on failure.
8. THE home page (`HomePageOne`) SHALL include a "Trending Now" section populated from `GET /api/trending?window=24h&limit=8` and a "Recommended for you" section populated from `GET /api/recommendations?limit=8`.
9. THE The_Frontend SHALL include an agentic-search input (a single text box plus submit) reachable from the header that calls `POST /api/agentic-search`, displays the returned `plan.explanation` above the results, and renders the result list using the existing product card component.
10. THE The_Frontend SHALL preserve all existing pages, routes, and styling assets that are not affected by these changes, and SHALL NOT eject Create React App.

### Requirement 13: Non-Functional Cross-Cutting Constraints

**User Story:** As a hackathon presenter, I want the demo to be fast, reasonably secure, and observable enough to debug live, so that it survives a live walkthrough.

#### Acceptance Criteria

1. WHEN any request is served against a seeded dataset of at most 200 products on a developer laptop, THE The_Backend SHALL produce `GET /api/products`, `GET /api/products/:id`, `GET /api/cart`, `GET /api/trending`, and `GET /api/search` responses with a 95th-percentile end-to-end latency at most 150 ms as measured over 100 sequential requests per endpoint.
2. THE The_Backend SHALL set the response headers `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin` on every HTTP response.
3. THE The_Backend SHALL configure CORS to allow only the origin specified by the `FRONTEND_ORIGIN` environment variable and SHALL allow credentials for that origin.
4. THE The_Backend SHALL redact `password`, `passwordHash`, `Authorization`, `Cookie`, and any environment value whose name ends with `_KEY` or `_SECRET` from every log line.
5. THE The_Backend SHALL assign a per-request `requestId` (UUIDv4) on entry, propagate it to every log line for that request, and echo it in the `X-Request-Id` response header.
6. THE The_Backend SHALL register a single graceful-shutdown handler on `SIGINT` and `SIGTERM` that closes the HTTP listener and the Valkey client before process exit.
