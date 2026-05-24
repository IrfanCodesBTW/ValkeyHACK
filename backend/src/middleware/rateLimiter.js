const { tooMany } = require("../lib/errors");

function fixedWindowRateLimit({ store, limit, windowSeconds, keyResolver }) {
  return async (req, res, next) => {
    const scope = keyResolver(req);
    const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `ratelimit:fixed:${scope}:${bucket}`;
    const count = await store.incr(key);
    if (count === 1) await store.expire(key, windowSeconds);
    const ttl = await store.ttl(key);
    const remaining = Math.max(0, limit - count);
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.floor(Date.now() / 1000) + Math.max(ttl, 0)));
    if (count > limit) {
      res.setHeader("Retry-After", String(Math.max(ttl, 1)));
      return next(tooMany("Too many requests", { retryAfterSeconds: Math.max(ttl, 1) }));
    }
    return next();
  };
}

function slidingWindowRateLimit({ store, limit, windowSeconds, keyResolver }) {
  if (store.kind !== "valkey") return fixedWindowRateLimit({ store, limit, windowSeconds, keyResolver });
  const script = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  return {0, limit - count, oldest[2] + window}
end
redis.call('ZADD', key, now, now .. '-' .. redis.call('INCR', key .. ':seq'))
redis.call('EXPIRE', key, window)
return {1, limit - count - 1, now + window}
`;
  return async (req, res, next) => {
    const scope = keyResolver(req);
    const key = `ratelimit:sliding:${scope}`;
    const now = Math.floor(Date.now() / 1000);
    const result = await store.eval(script, { keys: [key], arguments: [String(now), String(windowSeconds), String(limit)] });
    const allowed = Number(result[0]) === 1;
    const remaining = Math.max(0, Number(result[1]));
    const reset = Number(result[2]);
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(reset));
    if (!allowed) {
      res.setHeader("Retry-After", String(Math.max(1, reset - now)));
      return next(tooMany("Too many requests", { retryAfterSeconds: Math.max(1, reset - now) }));
    }
    return next();
  };
}

function tokenBucketRateLimit({ store, limit, windowSeconds, keyResolver }) {
  if (store.kind !== "valkey") return fixedWindowRateLimit({ store, limit, windowSeconds, keyResolver });
  const script = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refill = tonumber(ARGV[3])
local current = tonumber(redis.call('HGET', key, 'tokens') or capacity)
local last = tonumber(redis.call('HGET', key, 'lastRefill') or now)
local delta = math.max(0, now - last)
current = math.min(capacity, current + (delta * capacity / refill))
if current < 1 then
  redis.call('HMSET', key, 'tokens', current, 'lastRefill', now)
  redis.call('EXPIRE', key, refill * 2)
  return {0, math.floor(current), now + math.ceil((1 - current) * refill / capacity)}
end
current = current - 1
redis.call('HMSET', key, 'tokens', current, 'lastRefill', now)
redis.call('EXPIRE', key, refill * 2)
return {1, math.floor(current), now + refill}
`;
  return async (req, res, next) => {
    const now = Math.floor(Date.now() / 1000);
    const key = `ratelimit:bucket:${keyResolver(req)}`;
    const result = await store.eval(script, { keys: [key], arguments: [String(now), String(limit), String(windowSeconds)] });
    const allowed = Number(result[0]) === 1;
    const reset = Number(result[2]);
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, Number(result[1]))));
    res.setHeader("X-RateLimit-Reset", String(reset));
    if (!allowed) {
      res.setHeader("Retry-After", String(Math.max(1, reset - now)));
      return next(tooMany("Too many requests", { retryAfterSeconds: Math.max(1, reset - now) }));
    }
    return next();
  };
}

module.exports = { fixedWindowRateLimit, slidingWindowRateLimit, tokenBucketRateLimit };
