const { z } = require("zod");

const id = z.string().min(3);
const positiveInt = z.coerce.number().int().min(1).max(99);

const registerBody = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80)
});

const loginBody = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1)
});

const productQuery = z.object({
  categoryId: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  brand: z.string().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "rating_desc", "name_asc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12)
});

const searchQuery = productQuery.extend({
  q: z.string().optional().default(""),
  minRating: z.coerce.number().min(0).max(5).optional()
});

const cartItemBody = z.object({
  productId: id,
  quantity: positiveInt
});

const cartPatchBody = z.object({
  quantity: positiveInt
});

const couponBody = z.object({
  code: z.string().min(2).max(40).transform((value) => value.toUpperCase())
});

const productEventBody = z.object({
  productId: id,
  quantity: z.coerce.number().int().min(1).max(99).optional().default(1)
});

const checkoutBody = z.object({
  shippingAddress: z
    .object({
      name: z.string().min(1).max(120),
      phone: z.string().min(6).max(30),
      street: z.string().min(1).max(200),
      city: z.string().min(1).max(100),
      postalCode: z.string().min(3).max(20)
    })
    .optional()
});

const agenticBody = z.object({
  query: z.string().trim().min(3).max(512)
});

module.exports = {
  registerBody,
  loginBody,
  productQuery,
  searchQuery,
  cartItemBody,
  cartPatchBody,
  couponBody,
  productEventBody,
  checkoutBody,
  agenticBody
};
