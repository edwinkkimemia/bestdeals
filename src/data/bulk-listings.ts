/**
 * Bulk demo catalogue — 88 listings across every category (total 100 with core).
 * Clearly-marked demonstration data. Deterministic (no Math.random) so SSR +
 * hydration agree. Realistic Kenyan-market titles, KES prices, sellers, places.
 */
import { slugify } from "@/lib/utils";
import type { Listing } from "./catalog";

const u = (id: string) => `https://images.unsplash.com/${id}?w=800&q=80`;

type Seller = {
  name: string;
  kind: "individual" | "business";
  shop?: string;
  verified: boolean;
  phone: string; // fictional 0700-000-xxx demo range; production uses verified numbers
  county: string;
  town: string;
};

const SELLERS: Seller[] = [
  { name: "FonZone Nairobi", kind: "business", shop: "fon-zone-nairobi", verified: true, phone: "0722123456", county: "Nairobi", town: "CBD" },
  { name: "Mama Fua Styles", kind: "business", shop: "mama-fua-styles", verified: true, phone: "0733987654", county: "Nairobi", town: "Eastleigh" },
  { name: "Rift Hardware Ltd", kind: "business", shop: "rift-hardware", verified: false, phone: "0711223344", county: "Nakuru", town: "Nakuru Town" },
  { name: "Pwani Fresh Foods", kind: "business", shop: "pwani-fresh-foods", verified: true, phone: "0700111222", county: "Mombasa", town: "Nyali" },
  { name: "Wanjiku M.", kind: "individual", verified: false, phone: "0710000101", county: "Kiambu", town: "Thika" },
  { name: "Otieno J.", kind: "individual", verified: true, phone: "0710000102", county: "Kisumu", town: "Kondele" },
  { name: "Chebet R.", kind: "individual", verified: false, phone: "0710000103", county: "Uasin Gishu", town: "Eldoret" },
  { name: "Mwangi K.", kind: "individual", verified: false, phone: "0710000104", county: "Nakuru", town: "Naivasha" },
  { name: "Savannah SACCO", kind: "business", verified: true, phone: "0710000105", county: "Nairobi", town: "CBD" },
  { name: "Kamau FixIt", kind: "individual", verified: true, phone: "0710000106", county: "Kajiado", town: "Kitengela" },
  { name: "Naliaka W.", kind: "individual", verified: false, phone: "0710000107", county: "Nairobi", town: "Kilimani" },
  { name: "Baraka T.", kind: "individual", verified: false, phone: "0710000108", county: "Mombasa", town: "Likoni" },
];

const CAT_IMG: Record<string, string> = {
  "phones-tablets": u("photo-1511707171634-5f897ff02aa9"),
  "computers-electronics": u("photo-1496181133206-80ce9b88a853"),
  "tvs-entertainment": u("photo-1593359677879-a4bb92f829d1"),
  fashion: u("photo-1441986300917-64674bd600d8"),
  "home-furniture": u("photo-1555041469-a586c61ea9bc"),
  beauty: u("photo-1596462502278-27bfdc403348"),
  "baby-kids": u("photo-1519689680058-324335c77eba"),
  automotive: u("photo-1503376780353-7e6692767b70"),
  property: u("photo-1560518883-ce09059eeffa"),
  jobs: u("photo-1521737604893-d14cc237f11d"),
  "business-industrial": u("photo-1581091226825-a6a2a5aee158"),
  "sports-outdoors": u("photo-1517649763962-0c623066013b"),
  agriculture: u("photo-1500937386664-56d1dfef3854"),
  "hardware-building": u("photo-1504148455328-c376907d081c"),
  "books-education": u("photo-1481627834876-b7833e8f5570"),
  "food-household": u("photo-1542838132-92c53300491e"),
  services: u("photo-1521791136064-7986c2920216"),
  other: u("photo-1441986300917-64674bd600d8"),
};

type Opts = {
  sub?: string;
  was?: number; // discount % → genuine compareAt
  cond?: Listing["condition"];
  type?: Listing["listingType"];
  tx?: Listing["transactionMethod"];
  stock?: number;
  neg?: boolean;
  imgs?: string[];
  attr?: Record<string, string>;
  seller?: number;
  hrs?: number;
  feat?: boolean;
};

let _n = 0;

function B(title: string, desc: string, cat: string, price: number, o: Opts = {}): Listing {
  const i = _n++;
  const s = SELLERS[o.seller ?? (i % SELLERS.length)];
  const type = o.type ?? "product";
  const tx = o.tx ?? (type === "product" ? "buy_online" : type === "service" ? "request_quote" : "contact_seller");
  const id = `b${i + 1}`;
  return {
    id,
    slug: `${slugify(title)}-${id}`,
    title,
    description: desc,
    categorySlug: cat,
    subcategory: o.sub,
    price,
    compareAt: o.was ? Math.round(price / (1 - o.was / 100)) : null,
    condition: o.cond ?? "new",
    listingType: type,
    transactionMethod: tx,
    county: s.county,
    town: s.town,
    negotiable: o.neg ?? type !== "product",
    stock: o.stock ?? (type === "service" ? 999 : type === "classified" ? 1 : 10),
    images: o.imgs ?? [CAT_IMG[cat]],
    sellerName: s.name,
    sellerType: s.kind,
    sellerPhone: s.phone,
    ...(s.shop ? { shopSlug: s.shop } : {}),
    verified: s.verified,
    featured: o.feat,
    createdAt: new Date(Date.now() - (o.hrs ?? (3 + ((i * 53) % 690))) * 36e5).toISOString(),
    attributes: o.attr ?? {},
  };
}

export const BULK_LISTINGS: Listing[] = [
  // ---- Phones & tablets (7)
  B("Tecno Spark 20 128GB — Sealed, Free Cover", "Brand-new Tecno Spark 20 with 128GB storage, 5000mAh battery and free cover plus glass protector.", "phones-tablets", 16500, { sub: "Smartphones", seller: 0, imgs: [u("photo-1598327105666-5b89351aff97")], attr: { brand: "Tecno", storage: "128GB" }, hrs: 5 }),
  B("iPhone 12 128GB — Battery 89%, Boxed", "Neatly used iPhone 12, battery health 89%, boxed with cable. No scratches, Face ID perfect.", "phones-tablets", 48500, { sub: "Smartphones", type: "classified", cond: "used_good", seller: 4, imgs: [u("photo-1592750475338-74b7b21085ab")], attr: { brand: "Apple", storage: "128GB" }, hrs: 30 }),
  B("Samsung Galaxy A15 128GB — Sealed", "Sealed Galaxy A15, 50MP camera, 5000mAh battery, 1-year warranty.", "phones-tablets", 24500, { sub: "Smartphones", was: 8, seller: 0, attr: { brand: "Samsung", storage: "128GB" }, hrs: 12 }),
  B("Redmi 13C 256GB — Sealed", "New Redmi 13C with 256GB storage and 8GB RAM. Dual SIM, countrywide delivery.", "phones-tablets", 18999, { sub: "Smartphones", seller: 0, imgs: [u("photo-1580910051074-3eb694886505")], attr: { brand: "Xiaomi", storage: "256GB" }, hrs: 50 }),
  B("Oraimo FreePods Pro ANC Earbuds", "Active noise cancellation, 36-hour playtime with case, Bluetooth 5.3.", "phones-tablets", 4500, { sub: "Accessories", was: 18, seller: 0, imgs: [u("photo-1590658268037-6bf12165a8df")], hrs: 70 }),
  B("Apple Watch SE 40mm — Barely Used", "Apple Watch SE, scratch-free, with charger and extra strap. Battery perfect.", "phones-tablets", 22000, { sub: "Smartwatches", type: "classified", cond: "like_new", seller: 5, imgs: [u("photo-1523275335684-37898b6baf30")], hrs: 90 }),
  B("Infinix Note 40 Pro 256GB — Sealed", "New Note 40 Pro, AMOLED display, 108MP OIS camera, 70W fast charge.", "phones-tablets", 31999, { sub: "Smartphones", seller: 0, imgs: [u("photo-1598327105666-5b89351aff97")], attr: { brand: "Infinix", storage: "256GB" }, hrs: 120, feat: true }),
  // ---- Computers & electronics (7)
  B("Lenovo ThinkPad T480 i5 — Ex-UK, Clean", "Ex-UK ThinkPad T480, Core i5 8th gen, 8GB/256GB SSD, backlit keyboard. Ideal office machine.", "computers-electronics", 32500, { sub: "Laptops", type: "classified", cond: "used_good", seller: 7, attr: { brand: "Lenovo", processor: "i5-8250U", ram: "8GB" }, hrs: 15 }),
  B("MacBook Air M1 2020 — 256GB, Cycle 210", "Lightly used MacBook Air M1, 8GB/256GB, battery cycle 210. Comes with charger.", "computers-electronics", 89000, { sub: "Laptops", type: "classified", cond: "like_new", seller: 4, imgs: [u("photo-1517336714731-489689fd1ca8")], attr: { brand: "Apple", ram: "8GB" }, hrs: 40 }),
  B("HP EliteBook 840 G8 i7 — New", "New EliteBook 840 G8, Core i7 11th gen, 16GB/512GB SSD, Windows 11 Pro, 1-year warranty.", "computers-electronics", 92000, { sub: "Laptops", was: 7, seller: 0, imgs: [u("photo-1525547719571-a2d4ac8945e2")], attr: { brand: "HP", processor: "i7-1165G7", ram: "16GB" }, hrs: 60 }),
  B("JBL Flip 6 Portable Speaker", "Genuine JBL Flip 6, waterproof, 12-hour playtime. Sealed with warranty.", "computers-electronics", 18500, { sub: "Audio", seller: 0, imgs: [u("photo-1608043152269-423dbba4e7e1")], hrs: 80 }),
  B("Logitech MX Master 3S Mouse", "Original MX Master 3S, quiet clicks, MagSpeed scroll. Sealed.", "computers-electronics", 12500, { sub: "Accessories", seller: 0, imgs: [u("photo-1527864550417-7fd91fc51a46")], hrs: 100 }),
  B("Dell Inspiron 15 i3 13th Gen — New", "New Inspiron 15, Core i3-N305, 8GB/512GB SSD, Windows 11. Student-friendly price.", "computers-electronics", 62000, { sub: "Laptops", seller: 0, imgs: [u("photo-1593642632823-8f785ba67e45")], attr: { brand: "Dell", ram: "8GB" }, hrs: 140 }),
  B("Sony WH-1000XM5 Headphones — Sealed", "Flagship noise-cancelling headphones, 30-hour battery, multipoint connection.", "computers-electronics", 42000, { sub: "Audio", was: 10, seller: 0, imgs: [u("photo-1583394838336-acd977736f90")], hrs: 170 }),
  // ---- TVs & entertainment (4)
  B('Hisense 43" 4K Smart TV — Warranty', 'New Hisense 43" UHD Smart TV with Dolby Vision, Bluetooth remote, 2-year warranty.', "tvs-entertainment", 38999, { sub: "Smart TVs", was: 9, seller: 0, attr: { size: '43"' }, hrs: 20 }),
  B('Vitron 32" Frameless Smart TV', 'Affordable 32" frameless smart TV, Netflix and YouTube ready. Free delivery in Nairobi.', "tvs-entertainment", 18999, { sub: "Smart TVs", seller: 0, attr: { size: '32"' }, hrs: 65 }),
  B("Anker Soundcore Soundbar 60W", "Bluetooth soundbar with deep bass, HDMI ARC and optical input. Sealed.", "tvs-entertainment", 15000, { sub: "Sound Systems", seller: 0, imgs: [u("photo-1583394838336-acd977736f90")], hrs: 110 }),
  B("TV Wall Mounting + Setup (Nairobi)", "Professional wall mounting, cable trunking and channel setup at your place, same day.", "tvs-entertainment", 1200, { sub: "Streaming", type: "service", seller: 9, attr: { coverage: "Nairobi, Kiambu", priceRange: "From KSh 1,200" }, hrs: 200 }),
  // ---- Fashion (8)
  B("Nike Air Force 1 '07 White — Genuine", "Original Air Force 1, sizes 40–45. Boxed, receipt available on request.", "fashion", 13500, { sub: "Shoes", was: 10, seller: 1, imgs: [u("photo-1549298916-b41d501d3772")], hrs: 8 }),
  B("Adidas Adilette Comfort Slides", "Original Adilette slides, all sizes. Perfect for home and errands.", "fashion", 4200, { sub: "Shoes", seller: 1, imgs: [u("photo-1560343090-f0409e92791a")], hrs: 22 }),
  B("Bonia-Style Leather Handbag", "Premium synthetic-leather handbag with sling strap. Multiple colours.", "fashion", 3800, { sub: "Bags", seller: 1, imgs: [u("photo-1584917865442-de89df76afd3")], hrs: 35 }),
  B("Men's Slim Jeans — Pack of 2", "Stretch slim-fit jeans, waist 30–38. Navy and black.", "fashion", 2500, { sub: "Men", seller: 1, imgs: [u("photo-1542272604-787c3835535d")], hrs: 55 }),
  B("Ankara Maxi Dress — New Designs", "Flowing Ankara maxi, free size fits M–XL. Party and church ready.", "fashion", 2800, { sub: "Women", was: 20, seller: 1, hrs: 75 }),
  B("Suede Chelsea Boots — Barely Worn", "Size 43 Chelsea boots, worn twice. Selling because size runs small.", "fashion", 6500, { sub: "Shoes", type: "classified", cond: "like_new", seller: 6, imgs: [u("photo-1560343090-f0409e92791a")], hrs: 95 }),
  B("UV400 Unisex Sunglasses", "Polarised UV400 sunglasses with hard case and cloth. 6 styles.", "fashion", 1200, { sub: "Accessories", seller: 1, imgs: [u("photo-1572635196237-14b3f281503f")], hrs: 130 }),
  B("Men's Chronograph Watch + Box", "Stainless chronograph, water resistant, gift box included.", "fashion", 5500, { sub: "Accessories", was: 19, seller: 1, imgs: [u("photo-1523275335684-37898b6baf30")], hrs: 160, feat: true }),
  // ---- Home & furniture (7)
  B("3-Seater Fabric Sofa (Asphalt Grey)", "Brand-new 3-seater with solid mahogany frame. Free delivery within Nairobi.", "home-furniture", 38000, { sub: "Furniture", was: 16, seller: 6, hrs: 18 }),
  B("5x6 Bed + Fibre Mattress Combo", "Hardwood 5x6 bed plus 8-inch fibre mattress. Mattress sealed.", "home-furniture", 32000, { sub: "Furniture", seller: 6, imgs: [u("photo-1505693416388-ac5ce068fe85")], hrs: 42 }),
  B("4-Burner Gas Cooker with Oven — New", "Free-standing cooker, glass top, rotisserie oven. 1-year warranty.", "home-furniture", 28000, { sub: "Appliances", seller: 7, imgs: [u("photo-1556911220-bff31c812dba")], hrs: 68 }),
  B("Double-Door Fridge 205L — Works Perfectly", "Samsung double-door fridge, cooling perfectly, slight outer dent. Relocating sale.", "home-furniture", 34000, { sub: "Appliances", type: "classified", cond: "used_good", seller: 4, imgs: [u("photo-1571175443880-49e1d25b2bc5")], hrs: 88 }),
  B("Office Desk + Ergonomic Chair Set", "120cm desk plus adjustable chair. Ideal home office.", "home-furniture", 15000, { sub: "Furniture", seller: 5, imgs: [u("photo-1524758631624-e2822e304c36")], hrs: 115 }),
  B("Velvet Curtains Pair + Sheers", "2 heavy velvet curtains plus sheers, 2.5m drop. Maroon, navy, grey.", "home-furniture", 3500, { sub: "Décor", seller: 6, imgs: [u("photo-1513694203232-719a280e022f")], hrs: 150 }),
  B("Solid Wood Coffee Table", "Mango-wood coffee table, polished. Pickup in Naivasha or courier arranged.", "home-furniture", 8500, { sub: "Furniture", type: "classified", cond: "used_good", seller: 7, imgs: [u("photo-1493663284031-b7e3aefcae8e")], hrs: 190 }),
  // ---- Beauty (5)
  B('Brazilian Body-Wave Wig 22" + Closure', 'Grade 12A body-wave wig with 4x4 closure. Soft, minimal shedding, free wig cap.', "beauty", 12500, { sub: "Hair", was: 17, seller: 1, hrs: 10 }),
  B("Oud Touch Perfume 100ml — Original", "Long-lasting Arabian oud, sealed bottle. Delivery countrywide.", "beauty", 6800, { sub: "Fragrance", seller: 1, imgs: [u("photo-1541643600914-78b084683601")], hrs: 48 }),
  B("24-Colour Eyeshadow + 12 Brushes Kit", "Highly pigmented palette plus brush set. Gift packaging available.", "beauty", 2200, { sub: "Skincare", seller: 1, imgs: [u("photo-1522335789203-aabd1fc54bc9")], hrs: 85 }),
  B("Moisturising Skincare Combo (3-Step)", "Cleanser, moisturiser and sunscreen for dry/sensitive skin. Dermatologist-tested range.", "beauty", 5400, { sub: "Skincare", seller: 4, hrs: 125 }),
  B("Sisterlocks Installation (Nairobi)", "Certified loctician, neat small locks, aftercare guide included. House calls available.", "beauty", 3500, { sub: "Hair", type: "service", seller: 10, attr: { coverage: "Nairobi", priceRange: "From KSh 3,500" }, hrs: 210 }),
  // ---- Baby & kids (4)
  B("Foldable Baby Stroller — Good Condition", "Lightweight foldable stroller with canopy and basket. Used for one child.", "baby-kids", 9500, { sub: "Gear", type: "classified", cond: "used_good", seller: 10, hrs: 28 }),
  B("Huggies Diapers Bale (4 x 70pcs)", "Genuine Huggies bale, all sizes available. Best price for repeat buyers.", "baby-kids", 5200, { sub: "Diapers", was: 10, seller: 4, hrs: 72 }),
  B("Baby Clothes Bundle 0–12M (15pcs)", "Mittens, rompers, vests and hats bundle. Cotton, gently used and new mixed.", "baby-kids", 3000, { sub: "Clothing", seller: 1, hrs: 105 }),
  B("Wooden Baby Cot + Mattress", "Sturdy wooden cot with mosquito net rails and new mattress. Disassembles for transport.", "baby-kids", 14000, { sub: "Gear", type: "classified", cond: "used_good", seller: 11, hrs: 180 }),
  // ---- Automotive (8)
  B("Mazda Demio 2014 — Accident-Free", "Original paint, new tyres, valid inspection. Viewing in Naivasha, logbook ready.", "automotive", 780000, { sub: "Cars", type: "classified", cond: "used_good", seller: 7, imgs: [u("photo-1502877338535-766e1452684a")], attr: { make: "Mazda", model: "Demio", year: "2014", fuel: "Petrol", transmission: "Automatic" }, hrs: 14 }),
  B("Nissan Note 2017 — Low Mileage", "64,000km genuine mileage, push start, reverse camera. Eldoret viewing.", "automotive", 950000, { sub: "Cars", type: "classified", cond: "used_good", tx: "contact_seller", seller: 6, imgs: [u("photo-1552519507-da3b142c6e3d")], attr: { make: "Nissan", model: "Note", year: "2017", fuel: "Petrol", transmission: "Automatic" }, hrs: 38 }),
  B("Toyota Probox 2016 — Business Ready", "Well-maintained Probox, ideal delivery business. New suspension, logbook available.", "automotive", 890000, { sub: "Cars", type: "classified", cond: "used_good", seller: 7, attr: { make: "Toyota", model: "Probox", year: "2016", fuel: "Petrol", transmission: "Automatic" }, hrs: 62, feat: true }),
  B("Subaru Forester 2015 XT — Turbo", "Turbo Forester, leather interior, eyesight. Kisumu viewing weekends.", "automotive", 1650000, { sub: "Cars", type: "classified", cond: "used_good", tx: "contact_seller", seller: 5, attr: { make: "Subaru", model: "Forester", year: "2015", fuel: "Petrol", transmission: "Automatic" }, hrs: 95 }),
  B("Yamaha YBR 125 (2021) — New Tyres", "Fuel-efficient YBR, logbook ready. Perfect boda or commute bike.", "automotive", 155000, { sub: "Motorcycles", type: "classified", cond: "used_good", seller: 11, imgs: [u("photo-1558981403-c5f9899a28bc")], attr: { make: "Yamaha", model: "YBR 125", year: "2021" }, hrs: 125 }),
  B("70Ah Maintenance-Free Car Battery", "New 70Ah battery, 12-month replacement warranty. Free installation in Nakuru town.", "automotive", 14500, { sub: "Parts", seller: 2, hrs: 155 }),
  B('17" Alloy Rims Set (5 Holes)', "Clean second-hand alloys, no bends or welds. Fits most Japanese sedans.", "automotive", 45000, { sub: "Parts", type: "classified", cond: "used_good", seller: 6, imgs: [u("photo-1502877338535-766e1452684a")], hrs: 185 }),
  B("Front+Rear Dashcam 1080p + GPS", "Dual dashcam with night vision and parking monitor. Free installation guide.", "automotive", 7500, { sub: "Parts", seller: 0, imgs: [u("photo-1511707171634-5f897ff02aa9")], hrs: 230 }),
  // ---- Property (5)
  B("Bedsitter to Let — Umoja Innercore", "Tiled bedsitter, inbuilt wardrobe, balcony, borehole water. 5 min to stage.", "property", 9500, { sub: "Rentals", type: "classified", tx: "enquiry", seller: 10, imgs: [u("photo-1502672260266-1c1ef2d93688")], attr: { propertyType: "Bedsitter", bedrooms: "0", bathrooms: "1" }, hrs: 9 }),
  B("1BR to Let — Kileleshwa, Near Quickmart", "Spacious 1-bedroom, open kitchen, ample parking, CCTV. Viewing daily.", "property", 45000, { sub: "Rentals", type: "classified", tx: "enquiry", seller: 10, imgs: [u("photo-1560448204-e02f11c3d0e2")], attr: { propertyType: "1 Bedroom", bedrooms: "1", bathrooms: "1" }, hrs: 33 }),
  B("50x100 Plot — Kitengela, Ready Title", "Prime plot 2km off Namanga Road, water and electricity nearby. Freehold title ready.", "property", 850000, { sub: "Land", type: "classified", tx: "enquiry", seller: 9, attr: { propertyType: "Land" }, hrs: 58 }),
  B("3BR + DSQ for Sale — Syokimau", "All-ensuite 3-bedroom with DSQ in gated estate, borehole + backup power.", "property", 9800000, { sub: "Sales", type: "classified", tx: "enquiry", seller: 10, imgs: [u("photo-1560448204-e02f11c3d0e2")], attr: { propertyType: "3 Bedroom", bedrooms: "3", bathrooms: "3" }, hrs: 135 }),
  B("Shop Space — Tom Mboya St, CBD", "High-footfall ground-floor shop, 400 sq ft, ideal retail or eatery.", "property", 60000, { sub: "Commercial", type: "classified", tx: "enquiry", seller: 8, attr: { propertyType: "Commercial" }, hrs: 175 }),
  // ---- Jobs (3)
  B("Hiring: BCE Driver — Logistics Firm", "5+ years experience, clean record, Nairobi routes. Apply with CV and references. No fees.", "jobs", 0, { sub: "Full-time", type: "classified", tx: "enquiry", seller: 8, attr: { employmentType: "Full-time" }, hrs: 16 }),
  B("Hiring: House Manager — Kilimani", "Live-out house manager, childcare experience required. Two referees. No fees.", "jobs", 0, { sub: "Full-time", type: "classified", tx: "enquiry", seller: 10, attr: { employmentType: "Full-time" }, hrs: 78 }),
  B("Hiring: Remote Digital Marketer", "Meta/Google ads experience, portfolio required. Fully remote, monthly retainer.", "jobs", 0, { sub: "Remote", type: "classified", tx: "enquiry", seller: 8, attr: { employmentType: "Remote" }, hrs: 145 }),
  // ---- Business & industrial (4)
  B("Posho Mill + Huller Combo (New)", "Grade 2 posho mill with huller, 10HP diesel engine. Installation and training included.", "business-industrial", 185000, { sub: "Equipment", seller: 2, hrs: 25 }),
  B("Salon Styling Chairs (Pair)", "Hydraulic styling chairs in black leatherette. Salon closing — both in great shape.", "business-industrial", 42000, { sub: "Equipment", type: "classified", cond: "used_good", seller: 10, hrs: 66 }),
  B("Bizhub Photocopier — Serviced", "Office Bizhub, low copy count, recently serviced with new toner. Prints, scans, copies.", "business-industrial", 65000, { sub: "Equipment", type: "classified", cond: "refurbished", seller: 8, hrs: 108 }),
  B("5000L Water Tank + Free Delivery", "Food-grade 5000L tank, 5-year warranty. Free delivery within Nakuru county.", "business-industrial", 38000, { sub: "Wholesale", was: 10, seller: 2, hrs: 165 }),
  // ---- Sports & outdoors (4)
  B('Mountain Bike 26" 21-Speed (New)', "Steel-frame MTB with dual suspension and disc brakes. Free helmet included.", "sports-outdoors", 28000, { sub: "Cycling", was: 12, seller: 11, hrs: 21 }),
  B("Motorised Treadmill — Working Well", "2.5HP treadmill, incline + heart monitor. Home use only, selling due to relocation.", "sports-outdoors", 45000, { sub: "Fitness", type: "classified", cond: "used_good", seller: 10, imgs: [u("photo-1517836357463-d25dfeac3438")], hrs: 74 }),
  B("Rubber Dumbbell Set 20kg", "Hex dumbbells 2.5–10kg pairs with rack. Home gym starter.", "sports-outdoors", 8500, { sub: "Fitness", seller: 11, imgs: [u("photo-1571019613454-1cb2f99b2d8b")], hrs: 118 }),
  B("Pro Firm-Ground Football Boots", "Firm-ground boots, sizes 40–44. Great grip for murram and grass.", "sports-outdoors", 6500, { sub: "Team Sports", seller: 11, hrs: 168 }),
  // ---- Agriculture (5)
  B("DAP Fertilizer 50kg — Yara", "Original Yara DAP for planting season. Discount from 10 bags.", "agriculture", 5200, { sub: "Inputs", seller: 2, hrs: 11 }),
  B("Point-of-Lay Layers (Each)", "Healthy 18-week layers, vaccinated records available. Discount from 50 birds.", "agriculture", 950, { sub: "Livestock", type: "classified", tx: "contact_seller", seller: 6, hrs: 44 }),
  B("In-Calf Friesian Dairy Cow", "Second-calver Friesian, 7 months in-calf, 18L peak history. Nakuru viewing.", "agriculture", 95000, { sub: "Livestock", type: "classified", cond: "used_good", seller: 7, imgs: [u("photo-1625246333195-78d9c38ad449")], hrs: 92 }),
  B("Grafted Hass Avocado Seedlings", "Hardened Hass seedlings, ready for the rains. Extension advice included.", "agriculture", 250, { sub: "Seedlings", stock: 500, seller: 7, imgs: [u("photo-1625246333195-78d9c38ad449")], hrs: 132 }),
  B("8x15m Greenhouse Kit + Installation", "Galvanised 8x15m greenhouse with drip kit and shade net. Agronomist visit included.", "agriculture", 145000, { sub: "Equipment", seller: 2, hrs: 195 }),
  // ---- Hardware (4)
  B('9" Angle Grinder + 5 Discs', "Heavy-duty angle grinder with cutting and grinding discs. 6-month warranty.", "hardware-building", 9500, { sub: "Tools", seller: 2, hrs: 19 }),
  B("WeatherGuard Paint 20L (Assorted)", "Exterior weather paint, 20 litres. Tinting available in-store.", "hardware-building", 6800, { sub: "Materials", was: 9, seller: 2, hrs: 63 }),
  B("Steel Security Door + Frame", "Powder-coated steel door with frame and 3 locks. Multiple designs.", "hardware-building", 18500, { sub: "Materials", seller: 2, hrs: 122 }),
  B("Ceramic Floor Tiles 60x60 (Box)", "Glazed 60x60 tiles, 4pcs per box. Bulk discount from 20 boxes.", "hardware-building", 2400, { sub: "Materials", stock: 300, seller: 2, hrs: 178 }),
  // ---- Books & education (3)
  B("CBC Grade 6 Textbook Bundle (8 Books)", "Approved KICD titles, clean pages, all subjects covered.", "books-education", 4500, { sub: "Textbooks", seller: 4, imgs: [u("photo-1481627834876-b7833e8f5570")], hrs: 27 }),
  B("CPA Study Notes — All Levels", "Summarised CPA notes plus revision kits. Soft + printed copies.", "books-education", 3000, { sub: "Notes", type: "classified", cond: "used_good", seller: 4, imgs: [u("photo-1544716278-ca5e3f4abd8c")], hrs: 83 }),
  B("Thriller Novels Bundle (10 Books)", "Patterson, Grisham and Child titles. Crisp pages, great reads.", "books-education", 2500, { sub: "Novels", type: "classified", cond: "used_good", seller: 11, imgs: [u("photo-1544716278-ca5e3f4abd8c")], hrs: 152 }),
  // ---- Food & household (5)
  B("Pishori Rice 25kg Bale", "Aromatic pishori, well-dried and sorted. Discount for 5+ bales.", "food-household", 5200, { sub: "Groceries", seller: 3, hrs: 7 }),
  B("Cooking Oil 20L Jerrycan", "Cholesterol-free vegetable oil. Sealed jerrycan, best before 2027.", "food-household", 6800, { sub: "Groceries", was: 6, seller: 3, hrs: 36 }),
  B("Sugar Bale (20 x 2kg)", "Mumias sugar bale for home or retail. Countrywide courier.", "food-household", 3900, { sub: "Groceries", seller: 3, hrs: 69 }),
  B("Tray Eggs (30) — Farm Fresh", "Farm-gate tray eggs, collected daily. Discount from 10 trays.", "food-household", 420, { sub: "Fresh", stock: 200, seller: 6, hrs: 102 }),
  B("Pure Forest Honey 5L", "Unprocessed forest honey, lab-tested purity. Refill available.", "food-household", 5500, { sub: "Groceries", seller: 7, hrs: 142 }),
  // ---- Services (3)
  B("2BR Deep House Cleaning (Nairobi)", "Full deep clean: kitchen, bathrooms, balconies, windows. Team of 3, own equipment.", "services", 3500, { sub: "Cleaning", type: "service", seller: 10, imgs: [u("photo-1581578731548-c64695cc6952")], attr: { coverage: "Nairobi", priceRange: "From KSh 3,500" }, hrs: 24 }),
  B("Maths/Physics Home Tutor (Thika)", "KCSE maths/physics tutor, 6 years experience, proven A-grade track record.", "services", 1500, { sub: "Tutoring", type: "service", seller: 4, imgs: [u("photo-1503676260728-1c00da094a0b")], attr: { coverage: "Thika, Ruiru", priceRange: "KSh 1,500/hr" }, hrs: 96 }),
  B("Event MC + Decor (Nakuru)", "Weddings, ruracios and corporate events. Sound, decor and coordination packages.", "services", 25000, { sub: "Events", type: "service", seller: 7, attr: { coverage: "Nakuru, Naivasha", priceRange: "From KSh 25,000" }, hrs: 188 }),
  // ---- Other (2)
  B("5.5kVA Petrol Generator — Low Hours", "Single-phase generator, electric start, 60 running hours. Powers home + shop.", "other", 95000, { sub: "Misc", was: 10, seller: 2, hrs: 52 }),
  B("Hot & Cold Water Dispenser", "Bottom-load dispenser with child lock. Energy saving compressor cooling.", "other", 13500, { sub: "Misc", seller: 0, imgs: [u("photo-1556911220-bff31c812dba")], hrs: 148 }),
];
