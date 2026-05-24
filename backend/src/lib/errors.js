class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (code, message, details) => new AppError(400, code, message, details);
const unauthorized = (message = "Authentication required") =>
  new AppError(401, "UNAUTHORIZED", message);
const forbidden = (message = "Forbidden") => new AppError(403, "FORBIDDEN", message);
const notFound = (resource = "Resource") => new AppError(404, "NOT_FOUND", `${resource} not found`);
const conflict = (code, message, details) => new AppError(409, code, message, details);
const tooMany = (message, details) => new AppError(429, "RATE_LIMITED", message, details);

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooMany
};
