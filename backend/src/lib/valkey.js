const { createClient } = require("redis");
const config = require("../config");
const MemoryStore = require("./memoryStore");

async function detectCapabilities(client) {
  const capabilities = { json: false, search: false };
  try {
    await client.sendCommand(["JSON.GET", "__capability_probe__"]);
    capabilities.json = true;
  } catch (error) {
    capabilities.json = false;
  }

  try {
    await client.sendCommand(["FT._LIST"]);
    capabilities.search = true;
  } catch (error) {
    capabilities.search = false;
  }

  return capabilities;
}

async function createRedisStore() {
  const client = createClient({ url: config.valkeyUrl });
  client.on("error", (error) => {
    console.error(JSON.stringify({ event: "valkey_error", message: error.message }));
  });
  await client.connect();
  client.kind = "valkey";
  client.capabilities = await detectCapabilities(client);
  client.zRevRangeWithScores = async (key, start, stop) => client.zRangeWithScores(key, start, stop, { REV: true });
  client.health = async () => ({
    connected: client.isOpen,
    json: client.capabilities.json,
    search: client.capabilities.search,
    memory: false
  });
  return client;
}

async function createStore() {
  if (config.allowMemoryStore) {
    const memory = new MemoryStore();
    await memory.connect();
    return memory;
  }

  try {
    return await createRedisStore();
  } catch (error) {
    if (!config.allowMemoryStore) {
      throw new Error(
        `Unable to connect to Valkey at ${config.valkeyUrl}. Start Valkey or set ALLOW_MEMORY_STORE=true for local tests. ${error.message}`
      );
    }
    console.warn("Valkey unavailable; using in-memory store for this process.");
    const memory = new MemoryStore();
    await memory.connect();
    return memory;
  }
}

module.exports = { createStore };
