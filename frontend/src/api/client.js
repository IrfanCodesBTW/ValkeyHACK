const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || "Request failed");
    error.status = response.status;
    error.code = data?.error?.code;
    error.details = data?.error?.details;
    throw error;
  }
  return data;
}

export const api = {
  health: () => request("/api/health"),
  register: (body) => request("/api/auth/register", { method: "POST", body }),
  login: (body) => request("/api/auth/login", { method: "POST", body }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => request("/api/auth/me"),
  products: (params = {}) => request(`/api/products?${new URLSearchParams(clean(params))}`),
  product: (id) => request(`/api/products/${encodeURIComponent(id)}`),
  categories: () => request("/api/categories"),
  cart: () => request("/api/cart"),
  addCartItem: (body) => request("/api/cart/items", { method: "POST", body }),
  updateCartItem: (productId, body) => request(`/api/cart/items/${encodeURIComponent(productId)}`, { method: "PATCH", body }),
  removeCartItem: (productId) => request(`/api/cart/items/${encodeURIComponent(productId)}`, { method: "DELETE" }),
  clearCart: () => request("/api/cart", { method: "DELETE" }),
  applyCoupon: (code) => request("/api/cart/coupon", { method: "POST", body: { code } }),
  removeCoupon: () => request("/api/cart/coupon", { method: "DELETE" }),
  trackView: (productId) => request("/api/events/view", { method: "POST", body: { productId } }),
  trending: (params = {}) => request(`/api/trending?${new URLSearchParams(clean(params))}`),
  search: (params = {}) => request(`/api/search?${new URLSearchParams(clean(params))}`),
  suggestions: (q) => request(`/api/search/suggest?${new URLSearchParams(clean({ q }))}`),
  agenticSearch: (query) => request("/api/agentic-search", { method: "POST", body: { query } }),
  recommendations: (params = {}) => request(`/api/recommendations?${new URLSearchParams(clean(params))}`),
  checkout: (body, idempotencyKey) =>
    request("/api/checkout", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body,
    }),
};

function clean(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}
