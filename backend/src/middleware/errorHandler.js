const { AppError } = require("../lib/errors");

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
  const message = err instanceof AppError ? err.message : "Unexpected server error";

  if (!(err instanceof AppError)) {
    console.error(
      JSON.stringify({
        requestId: req.requestId,
        error: err.message,
        stack: err.stack
      })
    );
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {})
    }
  });
}

module.exports = errorHandler;
