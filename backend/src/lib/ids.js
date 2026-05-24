const crypto = require("crypto");

function createId(domain) {
  const nowHex = Date.now().toString(16).padStart(12, "0").slice(-12);
  const random = crypto.randomBytes(10).toString("hex");
  const uuidLike = `${nowHex.slice(0, 8)}-${nowHex.slice(8, 12)}-7${random.slice(0, 3)}-${random.slice(3, 7)}-${random.slice(7, 19)}`;
  return `${domain}:${uuidLike}`;
}

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function createRequestId() {
  return crypto.randomUUID();
}

module.exports = { createId, createToken, createRequestId };
