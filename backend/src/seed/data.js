const now = new Date("2026-05-24T00:00:00.000Z");

const categories = [
  { id: "category:electronics", name: "Electronics", slug: "electronics", parentId: null, icon: "devices" },
  { id: "category:laptops", name: "Laptops", slug: "laptops", parentId: "category:electronics", icon: "laptop" },
  { id: "category:gaming", name: "Gaming", slug: "gaming", parentId: "category:electronics", icon: "game-controller" },
  { id: "category:phones", name: "Smartphones", slug: "smartphones", parentId: "category:electronics", icon: "device-mobile" },
  { id: "category:audio", name: "Audio", slug: "audio", parentId: "category:electronics", icon: "headphones" },
  { id: "category:wearables", name: "Wearables", slug: "wearables", parentId: "category:electronics", icon: "watch" },
  { id: "category:accessories", name: "Accessories", slug: "accessories", parentId: "category:electronics", icon: "keyboard" },
  { id: "category:home-office", name: "Home Office", slug: "home-office", parentId: null, icon: "desk" }
];

const image = (index) => `/assets/images/thumbs/product-two-img${((index - 1) % 15) + 1}.png`;

const productSeed = [
  ["Acer Nitro V 15 Gaming Laptop", "Acer", "category:laptops", 58999, 4.5, ["gaming", "laptop", "rtx", "budget"], "RTX graphics, 144Hz display, 16GB RAM"],
  ["Lenovo LOQ Ryzen Gaming Laptop", "Lenovo", "category:laptops", 64999, 4.6, ["gaming", "laptop", "ryzen"], "Ryzen performance with dedicated graphics for college and esports"],
  ["HP Victus 16 Creator Laptop", "HP", "category:laptops", 72999, 4.4, ["gaming", "creator", "laptop"], "Large screen creator laptop with reliable cooling"],
  ["ASUS TUF F15 RTX 4050", "ASUS", "category:laptops", 78999, 4.7, ["gaming", "laptop", "rtx"], "Durable gaming laptop with RTX 4050 and 144Hz panel"],
  ["MacBook Air M3 13 inch", "Apple", "category:laptops", 114900, 4.8, ["laptop", "ultrabook", "apple"], "Thin and quiet laptop with all-day battery life"],
  ["Dell Inspiron 14 Student Laptop", "Dell", "category:laptops", 45999, 4.2, ["student", "laptop", "budget"], "Everyday laptop for classes, projects, and browsing"],
  ["Galaxy S25 256GB", "Samsung", "category:phones", 79999, 4.7, ["phone", "android", "camera"], "Flagship Android phone with excellent cameras"],
  ["iPhone 16 128GB", "Apple", "category:phones", 82999, 4.8, ["phone", "ios", "camera"], "Fast iPhone with strong video and app performance"],
  ["OnePlus 13R 5G", "OnePlus", "category:phones", 42999, 4.5, ["phone", "5g", "value"], "Performance Android phone with fast charging"],
  ["Nothing Phone 3a Pro", "Nothing", "category:phones", 31999, 4.3, ["phone", "camera", "design"], "Distinctive design with clean Android experience"],
  ["Sony WH-1000XM5 Headphones", "Sony", "category:audio", 29999, 4.8, ["audio", "headphones", "noise-cancelling"], "Premium wireless noise cancelling headphones"],
  ["boAt Airdopes ProGear", "boAt", "category:audio", 2499, 4.1, ["audio", "earbuds", "budget"], "Affordable earbuds with low latency mode"],
  ["JBL Flip 6 Bluetooth Speaker", "JBL", "category:audio", 8999, 4.5, ["audio", "speaker", "portable"], "Rugged portable speaker with punchy sound"],
  ["Apple Watch Series 10", "Apple", "category:wearables", 46999, 4.7, ["watch", "fitness", "ios"], "Advanced health and fitness tracking"],
  ["Samsung Galaxy Watch 7", "Samsung", "category:wearables", 26999, 4.4, ["watch", "android", "fitness"], "Smartwatch with sleep and body composition tracking"],
  ["Logitech MX Master 3S", "Logitech", "category:accessories", 8995, 4.8, ["mouse", "accessory", "productivity"], "Ergonomic wireless mouse for productivity"],
  ["Keychron K2 Wireless Keyboard", "Keychron", "category:accessories", 8499, 4.6, ["keyboard", "mechanical", "wireless"], "Compact mechanical keyboard for work and gaming"],
  ["Samsung 27 inch 2K Monitor", "Samsung", "category:home-office", 23999, 4.4, ["monitor", "office", "display"], "Sharp 2K display for home office setups"],
  ["LG Ultragear 24 inch Gaming Monitor", "LG", "category:gaming", 15999, 4.5, ["gaming", "monitor", "144hz"], "Fast refresh gaming monitor under budget"],
  ["Razer DeathAdder V3 Mouse", "Razer", "category:gaming", 6999, 4.6, ["gaming", "mouse", "esports"], "Lightweight esports mouse with precise sensor"],
  ["PlayStation 5 Slim Console", "Sony", "category:gaming", 54990, 4.9, ["gaming", "console", "playstation"], "Current generation console for cinematic games"],
  ["Xbox Series S Console", "Microsoft", "category:gaming", 34990, 4.5, ["gaming", "console", "budget"], "Compact console with Game Pass support"],
  ["Anker 737 Power Bank", "Anker", "category:accessories", 11999, 4.7, ["powerbank", "travel", "usb-c"], "High-capacity fast charging power bank"],
  ["TP-Link Archer AX73 Router", "TP-Link", "category:home-office", 10999, 4.4, ["router", "wifi", "office"], "Wi-Fi 6 router for apartments and home offices"]
];

const products = productSeed.map(([name, brand, categoryId, price, rating, tags, shortDescription], index) => ({
  id: `product:${String(index + 1).padStart(3, "0")}`,
  sku: `VK-${String(index + 1).padStart(4, "0")}`,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  brand,
  categoryId,
  description: `${shortDescription}. Demo product stocked in the Hyderabad Valkey warehouse with real-time inventory and search metadata.`,
  shortDescription,
  price,
  compareAtPrice: Math.round(price * 1.12),
  currency: "INR",
  image: image(index + 1),
  images: [image(index + 1), image(index + 2), image(index + 3)],
  rating,
  reviewCount: 120 + index * 37,
  tags,
  inventory: {
    quantity: 15 + (index % 8) * 6,
    reserved: 0,
    warehouse: "HYD-WH-01"
  },
  status: "active",
  createdAt: new Date(now.getTime() - index * 86400000).toISOString(),
  updatedAt: now.toISOString()
}));

const coupons = [
  {
    code: "VALKEY10",
    type: "percentage",
    value: 10,
    minOrderAmount: 10000,
    maxDiscount: 5000,
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2027-01-01T00:00:00.000Z",
    usageLimit: 500,
    usedCount: 0,
    active: true
  },
  {
    code: "HACKATHON500",
    type: "fixed",
    value: 500,
    minOrderAmount: 5000,
    maxDiscount: 500,
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2027-01-01T00:00:00.000Z",
    usageLimit: 500,
    usedCount: 0,
    active: true
  },
  {
    code: "EXPIRED20",
    type: "percentage",
    value: 20,
    minOrderAmount: 1000,
    maxDiscount: 2000,
    validFrom: "2024-01-01T00:00:00.000Z",
    validUntil: "2024-12-31T00:00:00.000Z",
    usageLimit: 10,
    usedCount: 0,
    active: true
  }
];

module.exports = { categories, products, coupons };
