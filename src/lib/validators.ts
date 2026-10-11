import { z } from "zod";
import { categoryBySlug } from "@/data/catalog";

export const signupSchema = z.object({
  name: z.string().min(2, "Enter your name").max(80),
  businessName: z.string().trim().max(80).optional().default(""),
  email: z.string().email("Enter a valid email"),
  phone: z
    .string()
    .regex(/^(\+254|0)[17]\d{8}$/, "Use a valid Kenyan phone e.g. 0712345678"),
  password: z.string().min(8, "Minimum 8 characters").max(72),
  acceptTerms: z.literal(true, { error: "You must accept the Terms" }),
  sellerKind: z.enum(["individual", "business"]).default("individual"),
  ref: z.string().max(64).optional().default(""),
});

export const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const passwordRequestSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, "Missing reset token"),
  password: z.string().min(8, "Minimum 8 characters").max(72),
});

export const listingSchema = z.object({
  title: z.string().min(8, "Title needs at least 8 characters").max(120),
  description: z.string().min(20, "Describe the item (min 20 chars)").max(5000),
  categorySlug: z.string().min(1, "Choose a category"),
  subcategory: z.string().max(60).optional().default(""),
  price: z.coerce.number().int().min(1, "Enter a price in KES").max(500_000_000),
  compareAt: z.coerce.number().int().min(0).max(500_000_000).optional().nullable(),
  condition: z.enum(["new", "like_new", "used_good", "used_fair", "refurbished"]),
  listingType: z.enum(["product", "classified", "service"]),
  county: z.string().min(1, "Choose a county"),
  town: z.string().min(1, "Choose a town"),
  negotiable: z.boolean().default(false),
  transactionMethod: z.enum(["buy_online", "contact_seller", "request_quote", "enquiry"]),
  stock: z.coerce.number().int().min(0).max(100000).default(1),
  // Absolute URLs or server-issued /uploads/* paths (relative refs can't use .url()).
  images: z.array(z.string().min(1).max(500)).max(8).default([]),
  attributes: z.record(z.string(), z.string()).default({}),
}).refine(
  (d) => {
    const sub = (d.subcategory ?? "").trim();
    if (!sub) return true;
    const cat = categoryBySlug(d.categorySlug);
    return !!cat && cat.subcategories.some((s) => s.toLowerCase() === sub.toLowerCase());
  },
  { message: "Pick a subcategory from the list", path: ["subcategory"] }
);

export const shopSchema = z.object({
  name: z.string().min(3).max(80),
  description: z.string().min(20).max(2000),
  businessCategory: z.string().min(1),
  county: z.string().min(1),
  town: z.string().min(1),
  phone: z.string().regex(/^(\+254|0)[17]\d{8}$/),
  deliveryInfo: z.string().max(1000).default(""),
});

export const enquirySchema = z.object({
  listingId: z.string().min(1),
  message: z.string().min(5).max(2000),
  name: z.string().min(2).max(80),
  phone: z.string().regex(/^(\+254|0)[17]\d{8}$/),
});

export const checkoutSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().regex(/^(\+254|0)[17]\d{8}$/),
  email: z.string().email().optional().or(z.literal("")),
  county: z.string().min(1),
  town: z.string().min(1),
  address: z.string().min(4).max(300),
  instructions: z.string().max(500).default(""),
  deliveryMethod: z.enum(["standard", "express", "pickup"]),
  paymentMethod: z.literal("cod", { error: "Product checkout is cash on delivery." }),
  items: z
    .array(z.object({ id: z.string(), qty: z.coerce.number().int().min(1).max(99) }))
    .min(1),
  coupon: z.string().max(32).optional().default(""),
});

export const reviewSchema = z.object({
  orderId: z.string().min(1).optional(),
  listingId: z.string().min(1).optional(),
  shopSlug: z.string().min(1).optional(),
  sellerName: z.string().min(1).max(120).optional(),
  authorName: z.string().min(2).max(80),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().max(1000).default(""),
});

export const disputeSchema = z.object({
  orderId: z.string().min(1),
  reason: z.enum(["not_received", "not_as_described", "damaged", "wrong_item", "payment_issue", "other"]),
  details: z.string().max(2000).default(""),
  name: z.string().min(2).max(80),
  phone: z.string().regex(/^(\+254|0)[17]\d{8}$/),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type ListingInput = z.infer<typeof listingSchema>;
