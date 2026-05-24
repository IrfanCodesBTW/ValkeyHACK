const categorySynonyms = [
  { categoryId: "category:laptops", words: ["laptop", "laptops", "notebook", "student laptop"] },
  { categoryId: "category:gaming", words: ["gaming", "console", "esports", "playstation", "xbox"] },
  { categoryId: "category:phones", words: ["phone", "phones", "mobile", "smartphone", "camera phone"] },
  { categoryId: "category:audio", words: ["headphone", "headphones", "earbuds", "speaker", "audio"] },
  { categoryId: "category:wearables", words: ["watch", "wearable", "fitness"] },
  { categoryId: "category:accessories", words: ["keyboard", "mouse", "accessory", "power bank"] },
  { categoryId: "category:home-office", words: ["monitor", "router", "office", "wifi"] }
];

class AgenticSearchService {
  constructor(searchService) {
    this.searchService = searchService;
  }

  parse(query) {
    const lower = query.toLowerCase();
    const plan = {
      keywords: query,
      categoryFilter: undefined,
      priceRange: {},
      minRating: undefined,
      sort: "rating_desc",
      intent: "product_search"
    };

    for (const entry of categorySynonyms) {
      if (entry.words.some((word) => lower.includes(word))) {
        plan.categoryFilter = entry.categoryId;
        break;
      }
    }

    const under = lower.match(/\b(?:under|below|less than)\s*(?:rs\.?|inr|₹)?\s*([0-9,]+)/);
    const between = lower.match(/\bbetween\s*(?:rs\.?|inr|₹)?\s*([0-9,]+)\s*(?:and|-|to)\s*(?:rs\.?|inr|₹)?\s*([0-9,]+)/);
    if (between) {
      plan.priceRange.min = Number(between[1].replace(/,/g, ""));
      plan.priceRange.max = Number(between[2].replace(/,/g, ""));
    } else if (under) {
      plan.priceRange.max = Number(under[1].replace(/,/g, ""));
    }

    if (/\b(good|best|top|high)\s+ratings?\b/.test(lower) || /4\+|4 stars|four stars/.test(lower)) {
      plan.minRating = 4;
      plan.sort = "rating_desc";
    }
    if (/\bcheap|budget|affordable|low price\b/.test(lower)) plan.sort = "price_asc";
    if (/\bpremium|flagship|best\b/.test(lower)) plan.sort = "rating_desc";

    const noise = [
      "show",
      "me",
      "with",
      "good",
      "ratings",
      "rating",
      "under",
      "below",
      "budget",
      "best",
      "for",
      "the",
      "a",
      "an"
    ];
    plan.keywords = lower
      .replace(/[0-9,]+/g, " ")
      .split(/\s+/)
      .filter((word) => word && !noise.includes(word))
      .join(" ")
      .trim();
    if (!plan.keywords && plan.categoryFilter) plan.keywords = "";

    plan.explanation = `Interpreted as ${plan.categoryFilter || "all categories"}${plan.priceRange.max ? ` under INR ${plan.priceRange.max}` : ""}${plan.minRating ? " with rating 4+" : ""}.`;
    return plan;
  }

  async search(query) {
    const plan = this.parse(query);
    const response = await this.searchService.search({
      q: plan.keywords,
      categoryId: plan.categoryFilter,
      minPrice: plan.priceRange.min,
      maxPrice: plan.priceRange.max,
      minRating: plan.minRating,
      sort: plan.sort,
      page: 1,
      pageSize: 12
    });
    return {
      query,
      intent: plan.intent,
      plan,
      filters: {
        categoryId: plan.categoryFilter,
        minPrice: plan.priceRange.min,
        maxPrice: plan.priceRange.max,
        minRating: plan.minRating,
        sort: plan.sort
      },
      generatedSearchQuery: plan.keywords || "*",
      source: "deterministic",
      total: response.total,
      results: response.results
    };
  }
}

module.exports = { AgenticSearchService };
