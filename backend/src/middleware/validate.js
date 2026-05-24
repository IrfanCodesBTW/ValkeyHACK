const { badRequest } = require("../lib/errors");

function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        badRequest(
          "VALIDATION_ERROR",
          "Request validation failed",
          result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        )
      );
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = validate;
