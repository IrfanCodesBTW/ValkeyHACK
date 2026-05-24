const bcrypt = require("bcryptjs");
const config = require("../config");
const { createId, createToken } = require("../lib/ids");
const { badRequest, conflict, unauthorized, tooMany } = require("../lib/errors");

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

class AuthService {
  constructor(store, repos) {
    this.store = store;
    this.repos = repos;
  }

  async register(input) {
    const existing = await this.store.get(`user_email:${input.email}`);
    if (existing) throw conflict("EMAIL_EXISTS", "An account with this email already exists");

    const user = {
      id: createId("user"),
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: "customer",
      passwordHash: await bcrypt.hash(input.password, 12),
      createdAt: new Date().toISOString(),
      lastLoginAt: null
    };
    await this.repos.users.save(user.id, user);
    await this.store.set(`user_email:${user.email}`, user.id);
    return publicUser(user);
  }

  async login(input, ip) {
    const attemptsKey = `login_attempts:${input.email}:${ip || "unknown"}`;
    const attempts = Number((await this.store.get(attemptsKey)) || 0);
    if (attempts >= 5) throw tooMany("Too many failed login attempts. Try again later.");

    const userId = await this.store.get(`user_email:${input.email}`);
    const user = userId ? await this.repos.users.get(userId) : null;
    const ok = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
    if (!ok) {
      const next = await this.store.incr(attemptsKey);
      if (next === 1) await this.store.expire(attemptsKey, 900);
      throw unauthorized("Invalid email or password");
    }

    user.lastLoginAt = new Date().toISOString();
    await this.repos.users.save(user.id, user);
    await this.store.del(attemptsKey);

    const token = createToken();
    await this.store.setEx(`session:${token}`, config.session.ttlSeconds, user.id);
    return { user: publicUser(user), token };
  }

  async validateSession(token) {
    if (!token) throw unauthorized();
    const userId = await this.store.get(`session:${token}`);
    if (!userId) throw unauthorized("Session expired");
    await this.store.expire(`session:${token}`, config.session.ttlSeconds);
    const user = await this.repos.users.get(userId);
    if (!user) throw unauthorized("Session user no longer exists");
    return publicUser(user);
  }

  async logout(token) {
    if (!token) throw badRequest("NO_SESSION", "No active session");
    await this.store.del(`session:${token}`);
  }
}

module.exports = { AuthService, publicUser };
