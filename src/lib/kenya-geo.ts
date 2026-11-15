/**
 * Coarse county centroids used only for an optional "Use my location" button.
 * We resolve to the nearest county and discard the coordinates — precise GPS
 * is never stored or sent to analytics.
 */
type Point = { county: string; lat: number; lng: number };

export const COUNTY_CENTROIDS: Point[] = [
  { county: "Mombasa", lat: -4.0435, lng: 39.6682 },
  { county: "Kwale", lat: -4.1744, lng: 39.4521 },
  { county: "Kilifi", lat: -3.6305, lng: 39.8499 },
  { county: "Tana River", lat: -1.49, lng: 39.99 },
  { county: "Lamu", lat: -2.2717, lng: 40.902 },
  { county: "Taita-Taveta", lat: -3.396, lng: 38.556 },
  { county: "Garissa", lat: -0.4536, lng: 39.6461 },
  { county: "Wajir", lat: 1.7471, lng: 40.0573 },
  { county: "Mandera", lat: 3.9366, lng: 41.867 },
  { county: "Marsabit", lat: 2.3344, lng: 37.9899 },
  { county: "Isiolo", lat: 0.3546, lng: 37.5822 },
  { county: "Meru", lat: 0.05, lng: 37.65 },
  { county: "Tharaka-Nithi", lat: -0.3, lng: 37.85 },
  { county: "Embu", lat: -0.5389, lng: 37.4574 },
  { county: "Kitui", lat: -1.3667, lng: 38.0167 },
  { county: "Machakos", lat: -1.5177, lng: 37.2634 },
  { county: "Makueni", lat: -1.8022, lng: 37.624 },
  { county: "Nyandarua", lat: -0.273, lng: 36.379 },
  { county: "Nyeri", lat: -0.4169, lng: 36.9516 },
  { county: "Kirinyaga", lat: -0.4989, lng: 37.2828 },
  { county: "Murang'a", lat: -0.7167, lng: 37.15 },
  { county: "Kiambu", lat: -1.1714, lng: 36.8356 },
  { county: "Turkana", lat: 3.1191, lng: 35.5972 },
  { county: "West Pokot", lat: 1.242, lng: 35.111 },
  { county: "Samburu", lat: 1.0968, lng: 36.14 },
  { county: "Trans Nzoia", lat: 1.0157, lng: 35.0062 },
  { county: "Uasin Gishu", lat: 0.5143, lng: 35.2698 },
  { county: "Elgeyo-Marakwet", lat: 0.6703, lng: 35.508 },
  { county: "Nandi", lat: 0.203, lng: 35.105 },
  { county: "Baringo", lat: 0.4919, lng: 35.743 },
  { county: "Laikipia", lat: 0.05, lng: 36.5 },
  { county: "Nakuru", lat: -0.3031, lng: 36.08 },
  { county: "Narok", lat: -1.0833, lng: 35.8667 },
  { county: "Kajiado", lat: -1.85, lng: 36.7833 },
  { county: "Kericho", lat: -0.3667, lng: 35.2833 },
  { county: "Bomet", lat: -0.7833, lng: 35.3417 },
  { county: "Kakamega", lat: 0.2833, lng: 34.75 },
  { county: "Vihiga", lat: 0.05, lng: 34.7167 },
  { county: "Bungoma", lat: 0.5667, lng: 34.5667 },
  { county: "Busia", lat: 0.4667, lng: 34.1167 },
  { county: "Siaya", lat: 0.0667, lng: 34.2833 },
  { county: "Kisumu", lat: -0.0917, lng: 34.768 },
  { county: "Homa Bay", lat: -0.5333, lng: 34.45 },
  { county: "Migori", lat: -1.0667, lng: 34.4667 },
  { county: "Kisii", lat: -0.6833, lng: 34.7667 },
  { county: "Nyamira", lat: -0.5667, lng: 34.9333 },
  { county: "Nairobi", lat: -1.2864, lng: 36.8172 },
];

function distanceSq(lat: number, lng: number, point: Point): number {
  // Equirectangular approximation is plenty accurate for nearest-county use.
  const dLat = lat - point.lat;
  const dLng = (lng - point.lng) * Math.cos((lat * Math.PI) / 180);
  return dLat * dLat + dLng * dLng;
}

export function nearestCounty(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let best: Point | null = null;
  let bestDistance = Infinity;
  for (const point of COUNTY_CENTROIDS) {
    const distance = distanceSq(lat, lng, point);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = point;
    }
  }
  return best?.county ?? null;
}
