require("dotenv").config();

const bool = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ["true", "1", "yes"].includes(String(value).toLowerCase());
};

const number = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const config = {
  env: process.env.NODE_ENV || "development",
  port: number(process.env.PORT, 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  valkeyUrl: process.env.VALKEY_URL || "redis://localhost:6379",
  allowMemoryStore: bool(process.env.ALLOW_MEMORY_STORE, false),
  session: {
    cookieName: process.env.SESSION_COOKIE_NAME || "valkey_sid",
    ttlSeconds: number(process.env.SESSION_TTL_SECONDS, 86400),
    secureCookie: bool(process.env.COOKIE_SECURE, false)
  },
  llm: {
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    groqApiKey: process.env.GROQ_API_KEY || ""
  },
  rateLimits: {
    authLogin: {
      limit: number(process.env.AUTH_LOGIN_LIMIT, 5),
      windowSeconds: number(process.env.AUTH_LOGIN_WINDOW_SECONDS, 900)
    },
    search: {
      limit: number(process.env.SEARCH_LIMIT, 60),
      windowSeconds: number(process.env.SEARCH_WINDOW_SECONDS, 60)
    },
    checkout: {
      limit: number(process.env.CHECKOUT_LIMIT, 10),
      windowSeconds: number(process.env.CHECKOUT_WINDOW_SECONDS, 60)
    },
    recommendations: {
      limit: number(process.env.RECOMMENDATIONS_LIMIT, 60),
      windowSeconds: number(process.env.RECOMMENDATIONS_WINDOW_SECONDS, 60)
    }
  }
};

module.exports = config;
