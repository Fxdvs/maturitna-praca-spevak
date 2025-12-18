import { NextResponse } from "next/server";

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);

  const radius = 5000;
  const query = "pub";

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(query)}&key=${process.env.GOOGLE_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bars = data.results.map((place: any) => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity || "",
      rating: place.rating || 0,
      openNow: place.opening_hours?.open_now || false,
      distance: getDistanceFromLatLonInKm(
        userLat,
        userLng,
        place.geometry.location.lat,
        place.geometry.location.lng
      ),
    }));

    return NextResponse.json({ bars });
  } catch (err) {
    console.error("Chyba pri fetchovaní barov:", err);
    return NextResponse.json({ error: "Failed to fetch places" }, { status: 500 });
  }
}
