// Autocompletar de direcciones/lugares con Google Places API (New).
const KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY ?? "";
const BASE = "https://places.googleapis.com/v1";

export interface PlaceSuggestion {
  placeId: string;
  main: string;
  secondary: string;
}

export async function placesAutocomplete(
  input: string,
  bias?: { lat: number; lng: number },
): Promise<PlaceSuggestion[]> {
  if (!KEY || input.trim().length < 3) return [];
  try {
    const body: Record<string, unknown> = {
      input,
      languageCode: "es",
      regionCode: "co",
      includedRegionCodes: ["co"],
    };
    if (bias) {
      body.locationBias = {
        circle: {
          center: { latitude: bias.lat, longitude: bias.lng },
          radius: 30000,
        },
      };
    }
    const r = await fetch(`${BASE}/places:autocomplete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": KEY,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) return [];
    const data = await r.json();
    const list = (data.suggestions ?? []) as any[];
    return list
      .filter((s) => s.placePrediction)
      .map((s) => ({
        placeId: s.placePrediction.placeId as string,
        main:
          s.placePrediction.structuredFormat?.mainText?.text ??
          s.placePrediction.text?.text ??
          "",
        secondary:
          s.placePrediction.structuredFormat?.secondaryText?.text ?? "",
      }));
  } catch {
    return [];
  }
}

export async function placeDetails(
  placeId: string,
): Promise<{ lat: number; lng: number } | null> {
  if (!KEY) return null;
  try {
    const r = await fetch(`${BASE}/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": KEY,
        "X-Goog-FieldMask": "location",
      },
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data.location) return null;
    return { lat: data.location.latitude, lng: data.location.longitude };
  } catch {
    return null;
  }
}
