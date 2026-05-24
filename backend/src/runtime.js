const { createStore } = require("./lib/valkey");
const { createServices } = require("./services");

async function createRuntimeContext() {
  const store = await createStore();
  const services = createServices(store);
  return { store, services };
}

module.exports = { createRuntimeContext };
