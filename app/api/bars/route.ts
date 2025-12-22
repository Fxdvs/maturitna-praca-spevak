import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
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
  const radius = parseFloat(searchParams.get("radius") || "5"); // km

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Missing coordinates" },
      { status: 400 }
    );
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);

  try {
    // 1️⃣ Kontrola Supabase databázy - či existujú bary v radiuse
    console.log(`🔍 Hľadám bary v Supabase v radiuse ${radius}km...`);

    const { data: dbBars, error: dbError } = await supabase
      .from("bars")
      .select("*")
      .gte("latitude", userLat - radius / 111)
      .lte("latitude", userLat + radius / 111)
      .gte(
        "longitude",
        userLng - radius / (111 * Math.cos((userLat * Math.PI) / 180))
      )
      .lte(
        "longitude",
        userLng + radius / (111 * Math.cos((userLat * Math.PI) / 180))
      );

    if (dbError) {
      console.error("Supabase error:", dbError);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    // 2️⃣ Ak máme bary v databáze, vrátim ich s vypočítanou vzdialenosťou
    if (dbBars && dbBars.length > 0) {
      console.log(`✅ Nájdených ${dbBars.length} barov v Supabase`);

      const barsWithDistance = dbBars.map((bar) => ({
        id: bar.id,
        place_id: bar.place_id,
        name: bar.name,
        address: bar.address,
        rating: bar.rating,
        openNow: bar.open_now,
        distance: getDistanceFromLatLonInKm(
          userLat,
          userLng,
          parseFloat(bar.latitude),
          parseFloat(bar.longitude)
        ),
      }));

      return NextResponse.json({ bars: barsWithDistance, source: "database" });
    }

    // 3️⃣ Ak nemáme bary v databáze, hľadaj cez Google Places API
    console.log("❌ Žiadne bary v Supabase, hľadám cez Google Places...");

    const googleRadius = radius * 1000; // Konverzia na metre
    const googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${googleRadius}&keyword=pub&key=${process.env.GOOGLE_API_KEY}`;

    const googleRes = await fetch(googleUrl);
    const googleData = await googleRes.json();

    if (googleData.status !== "OK" || !googleData.results) {
      return NextResponse.json(
        { bars: [], error: "No places found" },
        { status: 200 }
      );
    }

    // 4️⃣ Mapovanie Google Places dát + získavanie detailov
    const bars = await Promise.all(
      googleData.results.map(async (place: any) => {
        let website = null;
        
        // Získaj details o bare (vrátane webstránky)
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=website,url&key=${process.env.GOOGLE_API_KEY}`;
          const detailsRes = await fetch(detailsUrl);
          const detailsData = await detailsRes.json();
          website = detailsData.result?.website || null;
          console.log(`📍 ${place.name}: ${website || "No website"}`);
        } catch (error) {
          console.error(`Error fetching details for ${place.name}:`, error);
        }

        return {
          id: place.place_id,
          place_id: place.place_id,
          name: place.name,
          address: place.vicinity || "",
          rating: place.rating || 0,
          openNow: place.opening_hours?.open_now || false,
          website: website,
          distance: getDistanceFromLatLonInKm(
            userLat,
            userLng,
            place.geometry.location.lat,
            place.geometry.location.lng
          ),
        };
      })
    );

    // 5️⃣ Uloženie nových barov do Supabase
    console.log(`💾 Ukladám ${bars.length} nových barov do Supabase...`);

    const barsToInsert = bars.map((bar: any) => ({
      place_id: bar.place_id,
      name: bar.name,
      address: bar.address,
      latitude: googleData.results.find(
        (p: any) => p.place_id === bar.place_id
      ).geometry.location.lat,
      longitude: googleData.results.find(
        (p: any) => p.place_id === bar.place_id
      ).geometry.location.lng,
      rating: bar.rating,
      open_now: bar.openNow,
    }));

    // Vloženie s `upsert` - ak place_id existuje, nerobí nič
    const { error: insertError } = await supabase
      .from("bars")
      .upsert(barsToInsert, { onConflict: "place_id" });

    if (insertError) {
      console.error("Error saving bars to database:", insertError);
    } else {
      console.log("✅ Bary uložené do Supabase");
    }

    return NextResponse.json({ bars, source: "google_places" });
  } catch (err) {
    console.error("Chyba pri fetchovaní barov:", err);
    return NextResponse.json(
      { error: "Failed to fetch places", bars: [] },
      { status: 500 }
    );
  }
}