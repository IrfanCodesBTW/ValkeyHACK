class MemoryStore {
  constructor() {
    this.kind = "memory";
    this.values = new Map();
    this.expires = new Map();
    this.capabilities = { json: false, search: false, searchModule: false };
  }

  async connect() {}

  async quit() {
    this.values.clear();
    this.expires.clear();
  }

  _isExpired(key) {
    const expiresAt = this.expires.get(key);
    if (!expiresAt) return false;
    if (Date.now() <= expiresAt) return false;
    this.values.delete(key);
    this.expires.delete(key);
    return true;
  }

  _get(key) {
    if (this._isExpired(key)) return undefined;
    return this.values.get(key);
  }

  async health() {
    return { connected: true, json: false, search: false, searchModule: false, memory: true };
  }

  async get(key) {
    const value = this._get(key);
    return typeof value === "string" ? value : null;
  }

  async set(key, value, options = {}) {
    if (options.NX && this._get(key) !== undefined) return null;
    this.values.set(key, String(value));
    if (options.EX) this.expires.set(key, Date.now() + Number(options.EX) * 1000);
    return "OK";
  }

  async setEx(key, seconds, value) {
    return this.set(key, value, { EX: seconds });
  }

  async del(key) {
    const keys = Array.isArray(key) ? key : [key];
    let count = 0;
    for (const item of keys) {
      if (this.values.delete(item)) count += 1;
      this.expires.delete(item);
    }
    return count;
  }

  async expire(key, seconds) {
    if (!this._get(key)) return 0;
    this.expires.set(key, Date.now() + Number(seconds) * 1000);
    return 1;
  }

  async ttl(key) {
    if (!this._get(key)) return -2;
    const expiresAt = this.expires.get(key);
    if (!expiresAt) return -1;
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  }

  async incr(key) {
    const next = Number(await this.get(key) || 0) + 1;
    await this.set(key, next);
    return next;
  }

  async hSet(key, field, value) {
    const hash = this._get(key) instanceof Map ? this._get(key) : new Map();
    if (typeof field === "object") {
      Object.entries(field).forEach(([itemKey, itemValue]) => hash.set(itemKey, String(itemValue)));
    } else {
      hash.set(field, String(value));
    }
    this.values.set(key, hash);
    return 1;
  }

  async hGetAll(key) {
    const hash = this._get(key);
    if (!(hash instanceof Map)) return {};
    return Object.fromEntries(hash.entries());
  }

  async hDel(key, field) {
    const hash = this._get(key);
    if (!(hash instanceof Map)) return 0;
    return hash.delete(field) ? 1 : 0;
  }

  async sAdd(key, members) {
    const set = this._get(key) instanceof Set ? this._get(key) : new Set();
    const list = Array.isArray(members) ? members : [members];
    list.forEach((member) => set.add(member));
    this.values.set(key, set);
    return list.length;
  }

  async sMembers(key) {
    const set = this._get(key);
    if (!(set instanceof Set)) return [];
    return Array.from(set);
  }

  async sIsMember(key, member) {
    const set = this._get(key);
    return set instanceof Set && set.has(member) ? 1 : 0;
  }

  async zAdd(key, entries) {
    const zset = this._get(key) instanceof Map ? this._get(key) : new Map();
    const list = Array.isArray(entries) ? entries : [entries];
    list.forEach((entry) => zset.set(entry.value, Number(entry.score)));
    this.values.set(key, zset);
    return list.length;
  }

  async zIncrBy(key, increment, member) {
    const zset = this._get(key) instanceof Map ? this._get(key) : new Map();
    const score = Number(zset.get(member) || 0) + Number(increment);
    zset.set(member, score);
    this.values.set(key, zset);
    return score;
  }

  async zRevRangeWithScores(key, start, stop) {
    const zset = this._get(key);
    if (!(zset instanceof Map)) return [];
    const sorted = Array.from(zset.entries())
      .map(([value, score]) => ({ value, score }))
      .sort((a, b) => b.score - a.score);
    const end = stop < 0 ? sorted.length : stop + 1;
    return sorted.slice(start, end);
  }

  async zRangeByScore(key, min, max) {
    const zset = this._get(key);
    if (!(zset instanceof Map)) return [];
    return Array.from(zset.entries())
      .filter(([, score]) => score >= Number(min) && score <= Number(max))
      .map(([value]) => value);
  }

  async zRem(key, member) {
    const zset = this._get(key);
    if (!(zset instanceof Map)) return 0;
    return zset.delete(member) ? 1 : 0;
  }

  async sendCommand(args) {
    const [command, ...rest] = args;
    const upper = String(command).toUpperCase();
    if (upper === "JSON.SET") {
      await this.set(rest[0], rest[2]);
      return "OK";
    }
    if (upper === "JSON.GET") {
      return this.get(rest[0]);
    }
    if (upper === "JSON.NUMINCRBY") {
      const key = rest[0];
      const path = rest[1].replace(/^\$\./, "");
      const increment = Number(rest[2]);
      const doc = JSON.parse((await this.get(key)) || "{}");
      const next = Number(doc[path] || 0) + increment;
      doc[path] = next;
      await this.set(key, JSON.stringify(doc));
      return String(next);
    }
    if (upper.startsWith("FT.")) {
      throw new Error("Search module unavailable in memory store");
    }
    throw new Error(`Unsupported memory command: ${args.join(" ")}`);
  }

  async scriptLoad(script) {
    return `memory:${script.length}`;
  }

  async evalSha() {
    throw new Error("Lua scripts are not available in memory store");
  }
}

module.exports = MemoryStore;
