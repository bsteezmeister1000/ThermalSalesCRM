const EARTH_RADIUS_MILES = 3958.8;

export const CEDAR_RAPIDS_CENTER = {
  label: "Cedar Rapids, IA",
  latitude: 41.9779,
  longitude: -91.6656,
  radiusMiles: 100
} as const;

const CITY_CENTROIDS: Record<string, { latitude: number; longitude: number }> = {
  "cedar rapids": { latitude: 41.9779, longitude: -91.6656 },
  marion: { latitude: 42.0333, longitude: -91.5969 },
  "iowa city": { latitude: 41.6611, longitude: -91.5302 },
  coralville: { latitude: 41.6764, longitude: -91.5804 },
  "north liberty": { latitude: 41.7492, longitude: -91.5977 },
  tiffin: { latitude: 41.7058, longitude: -91.6652 },
  waterloo: { latitude: 42.4928, longitude: -92.3426 },
  "cedar falls": { latitude: 42.5278, longitude: -92.4455 },
  dubuque: { latitude: 42.5006, longitude: -90.6646 },
  muscatine: { latitude: 41.4245, longitude: -91.0432 }
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineMiles(
  pointA: { latitude: number; longitude: number },
  pointB: { latitude: number; longitude: number }
) {
  const latDelta = toRadians(pointB.latitude - pointA.latitude);
  const lonDelta = toRadians(pointB.longitude - pointA.longitude);
  const latA = toRadians(pointA.latitude);
  const latB = toRadians(pointB.latitude);

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a));
}

export type RadiusMatch =
  | {
      inclusion: "inside";
      confidence: "exact" | "approx_city";
      miles: number;
      note: string;
    }
  | {
      inclusion: "outside" | "unknown";
      confidence: "exact" | "approx_city" | "unknown";
      miles?: number;
      note: string;
    };

export function classifyRadiusMatch(input: {
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) : RadiusMatch {
  if (typeof input.latitude === "number" && typeof input.longitude === "number") {
    const miles = haversineMiles(
      { latitude: input.latitude, longitude: input.longitude },
      CEDAR_RAPIDS_CENTER
    );

    return miles <= CEDAR_RAPIDS_CENTER.radiusMiles
      ? {
          inclusion: "inside",
          confidence: "exact",
          miles,
          note: "Radius verified from stored property coordinates."
        }
      : {
          inclusion: "outside",
          confidence: "exact",
          miles,
          note: "Outside the 100-mile radius based on stored property coordinates."
        };
  }

  const cityKey = input.city?.trim().toLowerCase();
  if (cityKey && CITY_CENTROIDS[cityKey]) {
    const miles = haversineMiles(CITY_CENTROIDS[cityKey], CEDAR_RAPIDS_CENTER);
    return miles <= CEDAR_RAPIDS_CENTER.radiusMiles
      ? {
          inclusion: "inside",
          confidence: "approx_city",
          miles,
          note: "Radius estimated from city centroid because property coordinates are missing."
        }
      : {
          inclusion: "outside",
          confidence: "approx_city",
          miles,
          note: "Outside the 100-mile radius based on city-centroid estimate."
        };
  }

  return {
    inclusion: "unknown",
    confidence: "unknown",
    note: "No coordinates or supported city centroid available for radius check."
  };
}
