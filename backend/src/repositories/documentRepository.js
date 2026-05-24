class DocumentRepository {
  constructor(store, prefix, allKey) {
    this.store = store;
    this.prefix = prefix;
    this.allKey = allKey;
  }

  key(id) {
    return id.startsWith(`${this.prefix}:`) ? id : `${this.prefix}:${id}`;
  }

  async save(id, document) {
    const key = this.key(id);
    const payload = JSON.stringify(document);
    if (this.store.capabilities?.json) {
      await this.store.sendCommand(["JSON.SET", key, "$", payload]);
    } else {
      await this.store.set(key, payload);
    }
    if (this.allKey) await this.store.sAdd(this.allKey, key);
    return document;
  }

  async get(id) {
    const key = this.key(id);
    let value;
    if (this.store.capabilities?.json) {
      value = await this.store.sendCommand(["JSON.GET", key]);
    } else {
      value = await this.store.get(key);
    }
    if (!value) return null;
    if (typeof value === "object") return value;
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  }

  async all() {
    const keys = this.allKey ? await this.store.sMembers(this.allKey) : [];
    const docs = await Promise.all(keys.map((key) => this.get(key)));
    return docs.filter(Boolean);
  }

  async delete(id) {
    const key = this.key(id);
    return this.store.del(key);
  }
}

module.exports = DocumentRepository;
