/** Kenyan counties + major towns. Voluntary location selection — no GPS required. */
export const KENYA_COUNTIES: { county: string; towns: string[] }[] = [
  { county: "Nairobi", towns: ["CBD", "Westlands", "Kilimani", "Kasarani", "Embakasi", "Karen", "Eastleigh"] },
  { county: "Mombasa", towns: ["Mvita", "Nyali", "Likoni", "Changamwe"] },
  { county: "Kisumu", towns: ["Kisumu Central", "Milimani", "Kondele"] },
  { county: "Nakuru", towns: ["Nakuru Town", "Naivasha", "Gilgil"] },
  { county: "Kiambu", towns: ["Thika", "Ruiru", "Kiambu Town", "Limuru"] },
  { county: "Machakos", towns: ["Machakos Town", "Athi River", "Syokimau"] },
  { county: "Kajiado", towns: ["Kitengela", "Ngong", "Kajiado Town"] },
  { county: "Uasin Gishu", towns: ["Eldoret"] },
  { county: "Kilifi", towns: ["Kilifi Town", "Malindi", "Watamu"] },
  { county: "Kwale", towns: ["Diani", "Ukunda", "Kwale Town"] },
  { county: "Nyeri", towns: ["Nyeri Town", "Karatina"] },
  { county: "Meru", towns: ["Meru Town", "Nkubu"] },
  { county: "Kakamega", towns: ["Kakamega Town", "Mumias"] },
  { county: "Kericho", towns: ["Kericho Town", "Litein"] },
  { county: "Eldama Ravine", towns: ["Eldama Ravine"] },
];

export const COUNTY_NAMES = KENYA_COUNTIES.map((c) => c.county);

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
