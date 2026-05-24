const { createRepositories } = require("../repositories");
const { AuthService } = require("./authService");
const { CatalogService } = require("./catalogService");
const { CartService } = require("./cartService");
const { TrendingService } = require("./trendingService");
const { SearchService } = require("./searchService");
const { RecommendationService } = require("./recommendationService");
const { AgenticSearchService } = require("./agenticSearchService");
const { CheckoutService } = require("./checkoutService");

function createServices(store) {
  const repos = createRepositories(store);
  const auth = new AuthService(store, repos);
  const catalog = new CatalogService(repos);
  const cart = new CartService(store, repos);
  const trending = new TrendingService(store, repos);
  const search = new SearchService(repos);
  const recommendations = new RecommendationService(store, repos);
  const agenticSearch = new AgenticSearchService(search);
  const checkout = new CheckoutService(store, repos, cart, trending, recommendations);
  return { store, repos, auth, catalog, cart, trending, search, recommendations, agenticSearch, checkout };
}

module.exports = { createServices };
