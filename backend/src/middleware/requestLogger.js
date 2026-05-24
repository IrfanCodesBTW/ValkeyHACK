const { createRequestId } = require("../lib/ids");

function redact(value) {
  if (!value || typeof value !== "object") return value;
  const blocked = new Set(["password", "passwordHash", "authorization", "cookie"]);
  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => [
      key,
      blocked.has(key.toLowerCase()) || key.endsWith("_KEY") || key.endsWith("_SECRET")
        ? "[REDACTED]"
        : val
    ])
  );
}

function requestLogger(req, res, next) {
  const started = Date.now();
  req.requestId = req.headers["x-request-id"] || createRequestId();
  res.setHeader("X-Request-Id", req.requestId);

  res.on("finish", () => {
    const line = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - started,
      ip: req.ip
    };
    console.log(JSON.stringify(redact(line)));
  });

  next();
}

module.exports = requestLogger;
