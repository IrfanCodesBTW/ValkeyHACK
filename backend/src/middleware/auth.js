const config = require("../config");
const { unauthorized } = require("../lib/errors");

function attachAuth(context) {
  return async (req, res, next) => {
    try {
      const token = req.cookies?.[config.session.cookieName];
      if (!token) return next();
      const user = await context.services.auth.validateSession(token);
      req.user = user;
      req.sessionToken = token;
      return next();
    } catch (error) {
      return next();
    }
  };
}

function requireAuth(req, res, next) {
  if (!req.user) return next(unauthorized());
  return next();
}

function actorId(req) {
  if (req.user?.id) return req.user.id;
  let anon = req.cookies?.valkey_anon;
  if (!anon) {
    anon = `anon:${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  }
  return anon;
}

module.exports = { attachAuth, requireAuth, actorId };
