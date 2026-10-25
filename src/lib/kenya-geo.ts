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
  { county: "Tana River", lat: -1.4900, lng: 39.9900 },
  { county: "Lamu", lat: -2.2717, lng: 40.9020 },
  { county: "Taita-Taveta", lat: -3.3960, lng: 38.5560 },
  { county: "Garissa", lat: -0.4536, lng: 39.6461 },
  { county: "Wajir", lat: 1.7471, lng: 40.0573 },
  { county: "Mandera", lat: 3.9366, lng: 41.8670 },
  { county: "Marsabit", lat: 2.3344, lng: 37.9899 },
  { county: "Isiolo", lat: 0.3546, lng: 37.5822 },
  { county: "Meru", lat: 0.0500, lng: 37.6500 },
  { county: "Tharaka-Nithi", lat: -0.3000, lng: 37.8500 },
  { county: "Embu", lat: -0.5389, lng: 37.4574 },
  { county: "Kitui", lat: -1.3667, lng: 38.0167 },
  { county: "Machakos", lat: -1.5177, lng: 37.2634 },
  { county: "Makueni", lat: -1.8022, lng: 37.6240 },
  { county: "Nyandarua", lat: -0.2730, lng: 36.3790 },
  { county: "Nyeri", lat: -0.4169, lng: 36.9516 },
  { county: "Kirinyaga", lat: -0.4989, lng: 37.2828 },
  { county: "Murang'a", lat: -0.7167, lng: 37.1500 },
  { county: "Kiambu", lat: -1.1714, lng: 36.8356 },
  { county: "Turkana", lat: 3.1191, lng: 35.5972 },
  { county: "West Pokot", lat: 1.2420, lng: 35.1110 },
  { county: "Samburu", lat: 1.0968, lng: 36.1400 },
  { county: "Trans Nzoia", lat: 1.0157, lng: 35.0062 },
  { county: "Uasin Gishu", lat: 0.5143, lng: 35.2698 },
  { county: "Elgeyo-Marakwet", lat: 0.6703, lng: 35.5080 },
  { county: "Nandi", lat: 0.2030, lng: 35.1050 },
  { county: "Baringo", lat: 0.4919, lng: 35.7430 },
  { county: "Laikipia", lat: 0.0500, lng: 36.5000 },
  { county: "Nakuru", lat: -0.3031, lng: 36.0800 },
  { county: "Narok", lat: -1.0833, lng: 35.8667 },
  { county: "Kajiado", lat: -1.8500, lng: 36.7833 },
  { county: "Kericho", lat: -0.3667, lng: 35.2833 },
  { county: "Bomet", lat: -0.7833, lng: 35.3417 },
  { county: "Kakamega", lat: 0.2833, lng: 34.7500 },
  { county: "Vihiga", lat: 0.0500, lng: 34.7167 },
  { county: "Bungoma", lat: 0.5667, lng: 34.5667 },
  { county: "Busia", lat: 0.4667, lng: 34.1167 },
  { county: "Siaya", lat: 0.0667, lng: 34.2833 },
  { county: "Kisumu", lat: -0.0917, lng: 34.7680 },
  { county: "Homa Bay", lat: -0.5333, lng: 34.4500 },
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
