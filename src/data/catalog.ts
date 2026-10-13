/** Central catalogue: categories, demo listings, shops. Backed by Postgres in production (Prisma); this module is the demo-mode source of truth + seed. */
import { BULK_LISTINGS } from "./bulk-listings";

export type Category = {
  slug: string;
  name: string;
  icon: string;
  blurb: string;
  image: string;
  subcategories: string[];
  attributes: { key: string; label: string; options?: string[] }[];
};

export type Listing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  subcategory?: string;
  price: number;
  compareAt?: number | null;
  condition: "new" | "like_new" | "used_good" | "used_fair" | "refurbished";
  listingType: "product" | "classified" | "service";
  transactionMethod: "buy_online" | "contact_seller" | "request_quote" | "enquiry";
  county: string;
  town: string;
  negotiable: boolean;
  stock: number;
  images: string[];
  sellerName: string;
  sellerType: "individual" | "business";
  /** Store owner id for seller-posted listings (avatar lookup survives renames). */
  ownerId?: string;
  sellerPhone?: string; // verified snapshot — WhatsApp ordering always uses this first
  shopSlug?: string;
  verified: boolean;
  featured?: boolean;
  rating?: number;
  sold?: boolean;
  createdAt: string;
  attributes: Record<string, string>;
};

export type Shop = {
  slug: string;
  name: string;
  description: string;
  businessCategory: string;
  county: string;
  town: string;
  phone: string;
  logo: string;
  cover: string;
  verified: boolean;
  rating: number;
  listingsCount: number;
  deliveryInfo: string;
  hours: string;
};

export const CATEGORIES: Category[] = [
  { slug: "phones-tablets", name: "Phones & Tablets", icon: "Smartphone", blurb: "New & pre-owned phones, tablets and accessories", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80", subcategories: ["Smartphones", "Tablets", "Accessories", "Smartwatches"], attributes: [{ key: "brand", label: "Brand" }, { key: "storage", label: "Storage", options: ["64GB", "128GB", "256GB", "512GB"] }, { key: "ram", label: "RAM" }] },
  { slug: "computers-electronics", name: "Computers & Electronics", icon: "Laptop", blurb: "Laptops, desktops, audio and gadgets", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80", subcategories: ["Laptops", "Desktops", "Audio", "Cameras"], attributes: [{ key: "brand", label: "Brand" }, { key: "processor", label: "Processor" }, { key: "ram", label: "RAM" }] },
  { slug: "tvs-entertainment", name: "TVs & Home Entertainment", icon: "Tv", blurb: "TVs, soundbars and home theatre", image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80", subcategories: ["Smart TVs", "Sound Systems", "Streaming"], attributes: [{ key: "size", label: 'Screen size', options: ['32"', '43"', '50"', '55"', '65"'] }] },
  { slug: "fashion", name: "Fashion & Accessories", icon: "Shirt", blurb: "Clothing, shoes, bags and style", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80", subcategories: ["Women", "Men", "Kids", "Shoes", "Bags", "Watches & Jewelry"], attributes: [{ key: "size", label: "Size" }, { key: "brand", label: "Brand" }] },
  { slug: "home-furniture", name: "Home, Furniture & Appliances", icon: "Sofa", blurb: "Furniture, décor and appliances", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80", subcategories: ["Furniture", "Appliances", "Décor"], attributes: [{ key: "material", label: "Material" }] },
  { slug: "beauty", name: "Beauty & Personal Care", icon: "Sparkles", blurb: "Skincare, hair and grooming", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80", subcategories: ["Skincare", "Hair", "Fragrance"], attributes: [] },
  { slug: "baby-kids", name: "Babies & Kids", icon: "Baby", blurb: "Essentials for little ones", image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&q=80", subcategories: ["Diapers", "Feeding", "Toys", "Clothing", "Gear & Furniture"], attributes: [{ key: "age", label: "Age range" }] },
  { slug: "automotive", name: "Vehicles", icon: "Car", blurb: "Cars, bikes, trucks, boats, parts and accessories", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80", subcategories: ["Cars", "Motorcycles", "Trucks & Lorries", "Buses & Vans", "Boats", "Parts & Accessories"], attributes: [{ key: "make", label: "Make" }, { key: "model", label: "Model" }, { key: "year", label: "Year" }, { key: "mileage", label: "Mileage (km)" }, { key: "fuel", label: "Fuel", options: ["Petrol", "Diesel", "Hybrid", "Electric"] }, { key: "transmission", label: "Transmission", options: ["Manual", "Automatic"] }] },
  { slug: "property", name: "Property & Rentals", icon: "Building2", blurb: "Rentals, sales and land", image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80", subcategories: ["Rentals", "Sales", "Land", "Commercial", "Short Stays"], attributes: [{ key: "propertyType", label: "Type", options: ["Bedsitter", "1 Bedroom", "2 Bedroom", "3 Bedroom", "Maisonette", "Land"] }, { key: "bedrooms", label: "Bedrooms" }, { key: "bathrooms", label: "Bathrooms" }] },
  { slug: "jobs", name: "Jobs & Employment", icon: "Briefcase", blurb: "Verified employer listings", image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80", subcategories: ["Full-time", "Part-time", "Contract", "Remote", "Internship"], attributes: [{ key: "employmentType", label: "Type" }] },
  { slug: "seeking-work", name: "Seeking Work & CVs", icon: "FileText", blurb: "Job seekers: post your CV, skills and availability", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80", subcategories: ["CVs & Resumes", "Freelance Profiles"], attributes: [{ key: "field", label: "Field" }, { key: "experience", label: "Experience" }] },
  { slug: "business-industrial", name: "Business & Industry", icon: "Factory", blurb: "Equipment and wholesale", image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80", subcategories: ["Equipment", "Wholesale", "Raw Materials"], attributes: [] },
  { slug: "commercial-equipment", name: "Commercial Equipment & Tools", icon: "Forklift", blurb: "Office, industrial, medical and catering equipment", image: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=80", subcategories: ["Office Equipment", "Industrial Machinery", "Restaurant & Catering", "Medical Equipment", "Power Tools"], attributes: [{ key: "brand", label: "Brand" }] },
  { slug: "sports-outdoors", name: "Leisure, Sports & Hobbies", icon: "Dumbbell", blurb: "Fitness, cycling, music, art and gaming", image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80", subcategories: ["Fitness", "Cycling", "Camping", "Musical Instruments", "Art & Crafts", "Gaming"], attributes: [] },
  { slug: "agriculture", name: "Agriculture & Farming", icon: "Tractor", blurb: "Seeds, feeds, tools and produce", image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80", subcategories: ["Inputs", "Equipment", "Produce"], attributes: [] },
  { slug: "hardware-building", name: "Repair & Construction", icon: "Hammer", blurb: "Tools, repairs, cement, paint and fittings", image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80", subcategories: ["Tools", "Materials", "Repair Services"], attributes: [] },
  { slug: "books-education", name: "Books & Education", icon: "BookOpen", blurb: "Textbooks, courses and stationery", image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80", subcategories: ["Textbooks", "Courses"], attributes: [] },
  { slug: "food-household", name: "Food & Household", icon: "ShoppingBasket", blurb: "Groceries and everyday essentials", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80", subcategories: ["Groceries", "Cleaning"], attributes: [] },
  { slug: "services", name: "Professional & Local Services", icon: "Wrench", blurb: "Fundis, cleaners, tutors and pros", image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80", subcategories: ["Home Repair", "Cleaning", "Tutoring", "Events", "Moving & Transport", "IT & Tech Services"], attributes: [{ key: "coverage", label: "Coverage area" }, { key: "priceRange", label: "Price range" }] },
  { slug: "animals-pets", name: "Animals & Pets", icon: "PawPrint", blurb: "Pets, poultry, livestock and supplies", image: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800&q=80", subcategories: ["Dogs", "Cats", "Poultry & Birds", "Fish & Aquariums", "Livestock", "Pet Food & Supplies"], attributes: [{ key: "breed", label: "Breed" }] },
  { slug: "other", name: "Other Categories", icon: "LayoutGrid", blurb: "Everything else", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80", subcategories: ["Misc"], attributes: [] },
];

export const SHOPS: Shop[] = [
  { slug: "fon-zone-nairobi", name: "FonZone Nairobi", description: "Genuine phones, laptops and accessories with warranty. Luthuli Avenue, Nairobi.", businessCategory: "Electronics retail", county: "Nairobi", town: "CBD", phone: "0722123456", logo: "https://images.unsplash.com/photo-1533228100845-08145b01de14?w=200&q=80", cover: "https://images.unsplash.com/photo-1533228100845-08145b01de14?w=1200&q=80", verified: true, rating: 4.7, listingsCount: 240, deliveryInfo: "Same-day delivery in Nairobi. Countrywide via courier 24–48h.", hours: "Mon–Sat 8:30am–7pm" },
  { slug: "mama-fua-styles", name: "Mama Fua Styles", description: "Affordable fashion for the whole family — new arrivals weekly.", businessCategory: "Fashion", county: "Nairobi", town: "Eastleigh", phone: "0733987654", logo: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=80", cover: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80", verified: true, rating: 4.5, listingsCount: 180, deliveryInfo: "Delivery across Nairobi; pickup in Eastleigh.", hours: "Mon–Sat 9am–6pm" },
  { slug: "rift-hardware", name: "Rift Hardware Ltd", description: "Wholesale & retail building materials. Best cement and steel prices in Nakuru.", businessCategory: "Hardware", county: "Nakuru", town: "Nakuru Town", phone: "0711223344", logo: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&q=80", cover: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&q=80", verified: false, rating: 4.2, listingsCount: 95, deliveryInfo: "Bulk delivery within Rift Valley.", hours: "Mon–Sat 8am–5:30pm" },
  { slug: "pwani-fresh-foods", name: "Pwani Fresh Foods", description: "Coast groceries, spices and household essentials delivered fresh.", businessCategory: "Groceries", county: "Mombasa", town: "Nyali", phone: "0700111222", logo: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80", cover: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80", verified: true, rating: 4.8, listingsCount: 120, deliveryInfo: "Same-day in Mombasa island & Nyali.", hours: "Daily 8am–8pm" },
];

const img = (id: string) => `https://images.unsplash.com/${id}?w=800&q=80`;

const CORE_LISTINGS: Listing[] = [
  { id: "p1", slug: "samsung-galaxy-a55-128gb-nairobi", title: "Samsung Galaxy A55 5G 128GB — Sealed, 1-Yr Warranty", description: "Brand-new Samsung Galaxy A55, sealed in box with 1-year Samsung Kenya warranty and free cover + protector. Pickup at Luthuli or same-day delivery in Nairobi.", categorySlug: "phones-tablets", subcategory: "Smartphones", price: 52999, compareAt: 59999, condition: "new", listingType: "product", transactionMethod: "buy_online", county: "Nairobi", town: "CBD", negotiable: false, stock: 14, images: [img("photo-1511707171634-5f897ff02aa9"), img("photo-1592750475338-74b7b21085ab")], sellerName: "FonZone Nairobi", sellerType: "business", sellerPhone: "0722123456", shopSlug: "fon-zone-nairobi", verified: true, featured: true, rating: 4.8, createdAt: new Date(Date.now() - 2 * 864e5).toISOString(), attributes: { brand: "Samsung", storage: "128GB", ram: "8GB" } },
  { id: "p2", slug: "hp-pavilion-15-i5-laptop", title: "HP Pavilion 15 — Core i5 13th Gen, 16GB/512GB SSD", description: "New HP Pavilion 15 with Windows 11, backlit keyboard and 1-year warranty. Ideal for campus and office work.", categorySlug: "computers-electronics", subcategory: "Laptops", price: 98500, compareAt: 109000, condition: "new", listingType: "product", transactionMethod: "buy_online", county: "Nairobi", town: "Westlands", negotiable: false, stock: 6, images: [img("photo-1496181133206-80ce9b88a853")], sellerName: "FonZone Nairobi", sellerType: "business", sellerPhone: "0722123456", shopSlug: "fon-zone-nairobi", verified: true, featured: true, rating: 4.7, createdAt: new Date(Date.now() - 1 * 864e5).toISOString(), attributes: { brand: "HP", processor: "i5-1335U", ram: "16GB" } },
  { id: "p3", slug: "tcl-55-inch-4k-smart-tv", title: 'TCL 55" 4K QLED Smart TV — Netflix & YouTube', description: "Crisp 4K QLED panel, Dolby Audio, 2-year warranty. Free wall bracket on installation within Nairobi.", categorySlug: "tvs-entertainment", subcategory: "Smart TVs", price: 54999, compareAt: 64999, condition: "new", listingType: "product", transactionMethod: "buy_online", county: "Nairobi", town: "Kilimani", negotiable: false, stock: 9, images: [img("photo-1593359677879-a4bb92f829d1")], sellerName: "FonZone Nairobi", sellerType: "business", sellerPhone: "0722123456", shopSlug: "fon-zone-nairobi", verified: true, featured: true, rating: 4.6, createdAt: new Date(Date.now() - 3 * 864e5).toISOString(), attributes: { size: '55"' } },
  { id: "c1", slug: "toyota-fielder-2016-nakuru", title: "Toyota Fielder 2016 — 1.5G, Well Maintained", description: "Genuine mileage 78,000km, new tyres, serviced at Toyota Kenya. Viewing in Nakuru Town. Logbook ready.", categorySlug: "automotive", subcategory: "Cars", price: 1450000, compareAt: null, condition: "used_good", listingType: "classified", transactionMethod: "contact_seller", county: "Nakuru", town: "Nakuru Town", negotiable: true, stock: 1, images: [img("photo-1503376780353-7e6692767b70")], sellerName: "Daniel K.", sellerType: "individual", sellerPhone: "0710000109", verified: false, rating: 4.4, createdAt: new Date(Date.now() - 5 * 864e5).toISOString(), attributes: { make: "Toyota", model: "Fielder", year: "2016", mileage: "78,000 km", fuel: "Petrol", transmission: "Automatic" } },
  { id: "c2", slug: "2-bedroom-kilifi-rent", title: "Modern 2-Bedroom to Let — Mtwapa, Near Beach Road", description: "Spacious 2-bedroom with borehole water, parking and balcony. 10 min to the beach. Viewing weekends.", categorySlug: "property", subcategory: "Rentals", price: 28000, compareAt: null, condition: "new", listingType: "classified", transactionMethod: "enquiry", county: "Kilifi", town: "Malindi", negotiable: false, stock: 1, images: [img("photo-1560518883-ce09059eeffa")], sellerName: "Pwani Homes", sellerType: "individual", sellerPhone: "0710000110", verified: false, createdAt: new Date(Date.now() - 1 * 864e5).toISOString(), attributes: { propertyType: "2 Bedroom", bedrooms: "2", bathrooms: "1" } },
  { id: "c3", slug: "grade-2-leather-sofa-kisumu", title: "5-Seater Leather Sofa — Barely Used, Kisumu", description: "Relocating sale. Genuine leather 5-seater, no tears. Buyer collects from Milimani.", categorySlug: "home-furniture", subcategory: "Furniture", price: 45000, compareAt: 68000, condition: "like_new", listingType: "classified", transactionMethod: "contact_seller", county: "Kisumu", town: "Milimani", negotiable: true, stock: 1, images: [img("photo-1555041469-a586c61ea9bc")], sellerName: "Achieng O.", sellerType: "individual", sellerPhone: "0710000111", verified: false, createdAt: new Date(Date.now() - 4 * 864e5).toISOString(), attributes: { material: "Leather" } },
  { id: "s1", slug: "pro-plumbing-nairobi-kitengela", title: "Pro Plumbing & Repairs — Nairobi, Kiambu & Kitengela", description: "Certified plumber: leak repair, installations, water heaters. Same-day response, written quote before work.", categorySlug: "services", subcategory: "Home Repair", price: 1500, compareAt: null, condition: "new", listingType: "service", transactionMethod: "request_quote", county: "Nairobi", town: "Kasarani", negotiable: false, stock: 999, images: [img("photo-1521791136064-7986c2920216")], sellerName: "Kamau FixIt", sellerType: "individual", sellerPhone: "0710000106", verified: true, rating: 4.9, createdAt: new Date(Date.now() - 6 * 864e5).toISOString(), attributes: { coverage: "Nairobi, Kiambu, Kajiado", priceRange: "From KSh 1,500" } },
  { id: "p4", slug: "ankara-dresses-eastleigh", title: "Ankara Midi Dresses — New Stock, Sizes M–XXL", description: "Vibrant Ankara midi dresses, quality stitching. Wholesale from 6 pieces.", categorySlug: "fashion", subcategory: "Women", price: 1800, compareAt: 2500, condition: "new", listingType: "product", transactionMethod: "buy_online", county: "Nairobi", town: "Eastleigh", negotiable: false, stock: 60, images: [img("photo-1441986300917-64674bd600d8")], sellerName: "Mama Fua Styles", sellerType: "business", sellerPhone: "0733987654", shopSlug: "mama-fua-styles", verified: true, rating: 4.5, createdAt: new Date(Date.now() - 8 * 864e4).toISOString(), attributes: { size: "M–XXL" } },
  { id: "p5", slug: "maize-flour-2kg-bale-pwani", title: "Fortified Maize Flour 2kg Bale — Pwani Fresh", description: "Freshly milled fortified flour. Bales of 12 for homes and institutions.", categorySlug: "food-household", subcategory: "Groceries", price: 210, compareAt: null, condition: "new", listingType: "product", transactionMethod: "buy_online", county: "Mombasa", town: "Nyali", negotiable: false, stock: 400, images: [img("photo-1542838132-92c53300491e")], sellerName: "Pwani Fresh Foods", sellerType: "business", sellerPhone: "0700111222", shopSlug: "pwani-fresh-foods", verified: true, rating: 4.8, createdAt: new Date(Date.now() - 12 * 864e4).toISOString(), attributes: {} },
  { id: "c4", slug: "honda-ace-125-eldoret", title: "Honda Ace 125 (2022) — Low Mileage, Eldoret", description: "Well-kept Honda Ace, logbook available. Ideal for boda or delivery business.", categorySlug: "automotive", subcategory: "Motorcycles", price: 135000, compareAt: null, condition: "used_good", listingType: "classified", transactionMethod: "contact_seller", county: "Uasin Gishu", town: "Eldoret", negotiable: true, stock: 1, images: [img("photo-1558981403-c5f9899a28bc")], sellerName: "Kiprop M.", sellerType: "individual", sellerPhone: "0710000112", verified: false, createdAt: new Date(Date.now() - 2 * 864e5).toISOString(), attributes: { make: "Honda", model: "Ace 125", year: "2022" } },
  { id: "p6", slug: "cement-bamburi-50kg-nakuru", title: "Bamburi Cement 50kg — Wholesale from 50 Bags", description: "Genuine Bamburi Power Plus. Bulk discount + delivery within Nakuru county.", categorySlug: "hardware-building", subcategory: "Materials", price: 780, compareAt: 850, condition: "new", listingType: "product", transactionMethod: "buy_online", county: "Nakuru", town: "Nakuru Town", negotiable: false, stock: 2000, images: [img("photo-1504148455328-c376907d081c")], sellerName: "Rift Hardware Ltd", sellerType: "business", sellerPhone: "0711223344", shopSlug: "rift-hardware", verified: false, rating: 4.2, createdAt: new Date(Date.now() - 7 * 864e4).toISOString(), attributes: {} },
  { id: "c5", slug: "accountant-nairobi-cbd-hiring", title: "Hiring: Junior Accountant — Nairobi CBD (Verified Employer)", description: "CPA part-qualified, 1+ yr experience. Apply with CV before expiry. No application fee — report anyone asking for money.", categorySlug: "jobs", subcategory: "Full-time", price: 0, compareAt: null, condition: "new", listingType: "classified", transactionMethod: "enquiry", county: "Nairobi", town: "CBD", negotiable: false, stock: 2, images: [img("photo-1521737604893-d14cc237f11d")], sellerName: "Savannah SACCO", sellerType: "business", sellerPhone: "0710000105", verified: true, createdAt: new Date(Date.now() - 3 * 864e5).toISOString(), attributes: { employmentType: "Full-time" } },
];

/** Full demo catalogue: 12 curated + 88 bulk = 100 listings. */
export const LISTINGS: Listing[] = [...CORE_LISTINGS, ...BULK_LISTINGS];

export function getListing(slugOrId: string): Listing | undefined {
  return LISTINGS.find((l) => l.slug === slugOrId || l.id === slugOrId);
}

export function getShop(slug: string): Shop | undefined {
  return SHOPS.find((s) => s.slug === slug);
}

export function shopListings(slug: string): Listing[] {
  return LISTINGS.filter((l) => l.shopSlug === slug);
}

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export const POPULAR_SEARCHES = [
  "Samsung A55",
  "Toyota Fielder",
  "2 bedroom Mtwapa",
  "HP Pavilion",
  "Honda Ace",
  "Ankara dresses",
  "Bamburi cement",
  "Plumber Nairobi",
];

/** Demo plans + commission rules (admin-configurable in production). */
export const SHOP_PLANS = [
  { id: "free", name: "Free", monthly: 0, annual: 0, listings: 5, features: ["Basic storefront", "5 active listings", "Seller dashboard", "Buyer enquiries"] },
  { id: "silver", name: "Silver", monthly: 499, annual: 4990, listings: 30, features: ["Everything in Free", "30 active listings", "Promotions & featured products", "Enhanced analytics"] },
  { id: "gold", name: "Gold", monthly: 999, annual: 9990, listings: Infinity, features: ["Everything in Silver", "Unlimited listings", "Bulk CSV upload", "Staff accounts", "Advanced analytics"] },
];

/** Human-readable listing allowance ("5", "30", "Unlimited"). */
export const planListings = (p: { listings: number }): string =>
  Number.isFinite(p.listings) ? p.listings.toLocaleString() : "Unlimited";

export const COMMISSION_BPS_DEFAULT = 500; // 5%

/** Paid visibility products: Featured boosts + TOP pins (Jiji-style bump economics). */
export const BOOST_PRODUCTS = [
  { id: "boost-7", name: "Featured · 7 days", kind: "featured", days: 7, price: 199 },
  { id: "boost-14", name: "Featured · 14 days", kind: "featured", days: 14, price: 299 },
  { id: "boost-30", name: "Featured · 30 days", kind: "featured", days: 30, price: 499 },
  // TOP pins sit above organics for 7/30 days (single-ad pin, Jiji-style).
  { id: "top-7", name: "TOP pin · 7 days", kind: "top", days: 7, price: 349 },
  { id: "top-30", name: "TOP pin · 30 days", kind: "top", days: 30, price: 899 },
  // Portfolio tiers: longer window + auto-bump cadence handled in search ranking.
  { id: "boost-premium-30", name: "Boost Premium · 30 days (5× reach)", kind: "boost_premium", days: 30, price: 1299 },
  { id: "boost-vip-30", name: "Boost VIP · 30 days (7× reach + Similar Ads)", kind: "boost_vip", days: 30, price: 2499 },
];

export const boostProductById = (id: string) => BOOST_PRODUCTS.find((p) => p.id === id) ?? null;
