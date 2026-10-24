/** Kenyan counties + major towns / subcounty headquarters. Voluntary location selection — no GPS required. */
export type KenyaCounty = { county: string; towns: string[]; image: string };

const img = (id: string) => `https://images.unsplash.com/${id}?w=800&q=80`;

export const KENYA_COUNTIES: KenyaCounty[] = [
  { county: "Mombasa", towns: ["Mvita", "Nyali", "Likoni", "Changamwe", "Kisauni", "Jomvu", "Bamburi", "Shanzu", "Tudor"], image: img("photo-1507525428034-b723cf961d3e") },
  { county: "Kwale", towns: ["Kwale Town", "Diani", "Ukunda", "Msambweni", "Kinango", "Lunga Lunga", "Matuga"], image: img("photo-1519046904884-53103b34b206") },
  { county: "Kilifi", towns: ["Kilifi Town", "Malindi", "Watamu", "Mtwapa", "Mariakani", "Gongoni", "Kaloleni"], image: img("photo-1505142468610-359e7d316be0") },
  { county: "Tana River", towns: ["Hola", "Garsen", "Bura", "Madogo"], image: img("photo-1518837695005-2083093ee35b") },
  { county: "Lamu", towns: ["Lamu Town", "Mpeketoni", "Witu", "Faza"], image: img("photo-1573843981267-be1999ff37cd") },
  { county: "Taita-Taveta", towns: ["Voi", "Taveta", "Wundanyi", "Mwatate", "Mackinnon Road"], image: img("photo-1516426122078-c23e76319801") },
  { county: "Garissa", towns: ["Garissa Town", "Dadaab", "Balambala", "Ijara", "Liboi"], image: img("photo-1473580044384-7ba9967e16a0") },
  { county: "Wajir", towns: ["Wajir Town", "Habaswein", "Griftu", "Tarbaj"], image: img("photo-1509316785289-025f5b846b35") },
  { county: "Mandera", towns: ["Mandera Town", "El Wak", "Rhamu", "Takaba"], image: img("photo-1467269204594-9661b134dd2b") },
  { county: "Marsabit", towns: ["Marsabit Town", "Moyale", "Laisamis", "Sololo", "Loiyangalani"], image: img("photo-1519681393784-d120267933ba") },
  { county: "Isiolo", towns: ["Isiolo Town", "Merti", "Garbatulla", "Modogashe"], image: img("photo-1509316785289-025f5b846b35") },
  { county: "Meru", towns: ["Meru Town", "Nkubu", "Maua", "Timau", "Mikinduri", "Githongo", "Nchiru"], image: img("photo-1506905925346-21bda4d32df4") },
  { county: "Tharaka-Nithi", towns: ["Chuka", "Chogoria", "Marimanti", "Nkubu Junction", "Kathwana"], image: img("photo-1470071459604-3b5ec3a7fe05") },
  { county: "Embu", towns: ["Embu Town", "Runyenjes", "Siakago", "Kiritiri", "Ishiara"], image: img("photo-1501785888041-af3ef285b470") },
  { county: "Kitui", towns: ["Kitui Town", "Mwingi", "Mutomo", "Kyuso", "Zombe", "Migwani"], image: img("photo-1625246333195-78d9c38ad449") },
  { county: "Machakos", towns: ["Machakos Town", "Athi River", "Syokimau", "Mlolongo", "Mavoko", "Kangundo", "Matuu", "Kathiani", "Tala"], image: img("photo-1480714378408-67cf0d13bc1b") },
  { county: "Makueni", towns: ["Wote", "Makindu", "Kibwezi", "Emali", "Sultan Hamud", "Nunguni", "Mtito Andei"], image: img("photo-1500382017468-9049fed747ef") },
  { county: "Nyandarua", towns: ["Ol Kalou", "Engineer", "Njabini", "Mairo Inya", "Ndaragwa", "Ol Jorok"], image: img("photo-1500937386664-56d1dfef3854") },
  { county: "Nyeri", towns: ["Nyeri Town", "Karatina", "Othaya", "Mukurweini", "Chaka", "Mweiga", "Narumoru"], image: img("photo-1433086966358-54859d0ed716") },
  { county: "Kirinyaga", towns: ["Kerugoya", "Sagana", "Kagio", "Kutus", "Wanguru", "Baricho"], image: img("photo-1464226184884-fa280b87c399") },
  { county: "Murang'a", towns: ["Murang'a Town", "Maragua", "Kangema", "Kigumo", "Kandara", "Kirwara", "Kahuro"], image: img("photo-1426604966848-d7adac402bff") },
  { county: "Kiambu", towns: ["Thika", "Ruiru", "Kiambu Town", "Limuru", "Kikuyu", "Juja", "Gatundu", "Githunguri", "Kabete", "Ruaka", "Banana", "Kiambaa", "Lari"], image: img("photo-1444723121867-7a241cacace9") },
  { county: "Turkana", towns: ["Lodwar", "Kakuma", "Lokichoggio", "Lokichar", "Kainuk"], image: img("photo-1542401886-65d6c61db217") },
  { county: "West Pokot", towns: ["Kapenguria", "Makutano", "Sigor", "Chepareria", "Alale"], image: img("photo-1469474968028-56623f02e42e") },
  { county: "Samburu", towns: ["Maralal", "Wamba", "Baragoi", "Archers Post"], image: img("photo-1523805009345-7448845a9e53") },
  { county: "Trans Nzoia", towns: ["Kitale", "Endebess", "Kiminini", "Saboti", "Kwanza"], image: img("photo-1560493676-04071c5f467b") },
  { county: "Uasin Gishu", towns: ["Eldoret", "Burnt Forest", "Turbo", "Moiben", "Ziwa", "Soy", "Kapsaret", "Ainabkoi"], image: img("photo-1514565131-fce0801e5785") },
  { county: "Elgeyo-Marakwet", towns: ["Iten", "Kapsowar", "Chebiemit", "Kaptarakwa", "Chesoi"], image: img("photo-1500534314209-a25ddb2bd429") },
  { county: "Nandi", towns: ["Kapsabet", "Nandi Hills", "Tinderet", "Kobujoi", "Mosoriot", "Kaiboi"], image: img("photo-1523712999610-f77fbcfc3843") },
  { county: "Baringo", towns: ["Kabarnet", "Eldama Ravine", "Marigat", "Mogotio", "Chemolingot", "Kabartonjo"], image: img("photo-1500530855697-b586d89ba3ee") },
  { county: "Laikipia", towns: ["Nanyuki", "Nyahururu", "Rumuruti", "Kinamba", "Doldol"], image: img("photo-1493246507139-91e8fad9978e") },
  { county: "Nakuru", towns: ["Nakuru Town", "Naivasha", "Gilgil", "Njoro", "Molo", "Bahati", "Rongai", "Subukia", "Mai Mahiu", "Elburgon"], image: img("photo-1501594907352-04cda38ebc29") },
  { county: "Narok", towns: ["Narok Town", "Kilgoris", "Ololulunga", "Suswa", "Lolgorian", "Ewaso Ng'iro"], image: img("photo-1549366021-9f761d450615") },
  { county: "Kajiado", towns: ["Kajiado Town", "Kitengela", "Ngong", "Ongata Rongai", "Kiserian", "Isinya", "Loitokitok", "Namanga", "Bulbul"], image: img("photo-1547471080-7cc2caa01a7e") },
  { county: "Kericho", towns: ["Kericho Town", "Litein", "Londiani", "Kipkelion", "Fort Ternan", "Sosiot", "Kapsoit"], image: img("photo-1447752875215-b2761acb3c5d") },
  { county: "Bomet", towns: ["Bomet Town", "Sotik", "Longisa", "Mulot", "Chemaner"], image: img("photo-1472214103451-9374bd1c798e") },
  { county: "Kakamega", towns: ["Kakamega Town", "Mumias", "Butere", "Malava", "Lugari", "Navakholo", "Shinyalu", "Khwisero", "Likuyani"], image: img("photo-1502082553048-f009c37129b9") },
  { county: "Vihiga", towns: ["Mbale", "Luanda", "Majengo", "Hamisi", "Chavakali", "Kaimosi"], image: img("photo-1476231682828-37e571bc172f") },
  { county: "Bungoma", towns: ["Bungoma Town", "Webuye", "Kimilili", "Sirisia", "Tongaren", "Mt Elgon"], image: img("photo-1504280390367-361c6d9f38f4") },
  { county: "Busia", towns: ["Busia Town", "Malaba", "Funyula", "Nambale", "Butula", "Port Victoria"], image: img("photo-1488459716781-31db52582fe9") },
  { county: "Siaya", towns: ["Siaya Town", "Bondo", "Ugunja", "Ukwala", "Yala", "Usenge", "Ng'iya"], image: img("photo-1439066615861-d1af74d74000") },
  { county: "Kisumu", towns: ["Kisumu Central", "Milimani", "Kondele", "Ahero", "Maseno", "Awasi", "Kombewa", "Katito", "Pap Onditi", "Kisumu East"], image: img("photo-1477959858617-67f85cf4f1df") },
  { county: "Homa Bay", towns: ["Homa Bay Town", "Oyugis", "Kendu Bay", "Mbita", "Ndhiwa", "Sindo", "Rangwe"], image: img("photo-1476514525535-07fb3b4ae5f1") },
  { county: "Migori", towns: ["Migori Town", "Rongo", "Awendo", "Isebania", "Kehancha", "Macalder", "Uriri"], image: img("photo-1542838132-92c53300491e") },
  { county: "Kisii", towns: ["Kisii Town", "Ogembo", "Suneka", "Marani", "Nyamache", "Kenyenya"], image: img("photo-1504674900247-0877df9cc836") },
  { county: "Nyamira", towns: ["Nyamira Town", "Keroka", "Nyansiongo", "Ekerenyo", "Magombo"], image: img("photo-1470071459604-3b5ec3a7fe05") },
  { county: "Nairobi", towns: ["CBD", "Westlands", "Kilimani", "Kasarani", "Embakasi", "Karen", "Eastleigh", "Dagoretti", "Langata", "Kibera", "Mathare", "Dandora", "Buruburu", "Umoja", "Kayole", "Ruai", "Lavington", "Kileleshwa", "Parklands", "South B", "Githurai", "Ruaraka"], image: img("photo-1449824913935-59a10b8d2000") },
];

/** Photo for a county (falls back to a neutral marketplace image). */
export function countyImage(county: string): string {
  const found = KENYA_COUNTIES.find((c) => c.county.toLowerCase() === county.trim().toLowerCase());
  return found?.image ?? img("photo-1441986300917-64674bd600d8");
}

export const COUNTY_NAMES = KENYA_COUNTIES.map((c) => c.county);

/** Stable URL slug for a county (e.g. "Homa Bay" → "homa-bay"). */
export function countySlug(county: string): string {
  return county
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/** Resolve a location URL segment ("homa-bay", "Homa Bay", "NAIROBI") to a county record. */
export function resolveCountyEntry(input: string): (typeof KENYA_COUNTIES)[number] | undefined {
  const decoded = decodeURIComponent(input).trim();
  const low = decoded.toLowerCase();
  const slug = countySlug(decoded);
  return KENYA_COUNTIES.find(
    (c) => c.county.toLowerCase() === low || countySlug(c.county) === slug
  );
}

export function townsFor(county: string): string[] {
  const t = county.trim().toLowerCase();
  return KENYA_COUNTIES.find((c) => c.county.toLowerCase() === t)?.towns ?? [];
}

/**
 * Resolve free user input to a canonical county slug for filtering.
 * Accepts "all"/"All Kenya"/"", county names in any case ("nakuru"),
 * and town names ("Eldoret" → "Uasin Gishu", "Thika" → "Kiambu").
 * Unresolvable input falls back to "all" — showing unfiltered results
 * instead of a bogus empty page.
 */
export function resolveCounty(input: string | null | undefined): string {
  const t = (input ?? "").trim();
  if (!t) return "all";
  const low = t.toLowerCase();
  if (low === "all" || low === "all kenya") return "all";
  const county = KENYA_COUNTIES.find((c) => c.county.toLowerCase() === low);
  if (county) return county.county;
  const byTown = KENYA_COUNTIES.find((c) => c.towns.some((town) => town.toLowerCase() === low));
  if (byTown) return byTown.county;
  return "all";
}

/** Case-insensitive county equality for filtering (both sides may be raw). */
export function countyMatches(listingCounty: string, filterCounty: string | null | undefined): boolean {
  const f = resolveCounty(filterCounty);
  if (f === "all") return true;
  return listingCounty.trim().toLowerCase() === f.toLowerCase();
}
