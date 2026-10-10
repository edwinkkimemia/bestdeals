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
  return KENYA_COUNTIES.find((c) => c.county === county)?.towns ?? [];
}
