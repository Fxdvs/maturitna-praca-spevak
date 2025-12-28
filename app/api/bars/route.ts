import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

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
  // ✅ Rate limiting check
  const clientIp = getClientIp(req);
  const rateLimitResult = await checkRateLimit(clientIp, "bars");

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: "Príliš veľa požiadaviek. Skúste znova neskôr.",
        resetAt: rateLimitResult.resetAt,
      },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Missing coordinates" },
      { status: 400 }
    );
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);

  try {
    // ✅ Progressive radius search until we find at least 10 bars
    const radiusSteps = [1, 3, 5, 7, 10];
    const MIN_BARS = 10;
    let foundBars: any[] = [];
    let usedRadius = 0;

    for (const radius of radiusSteps) {
      console.log(`🔍 Hľadám bary v radiuse ${radius}km... (Aktuálne: ${foundBars.length}/${MIN_BARS})`);

      // 1️⃣ Kontrola Supabase databázy
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

      // 2️⃣ Pridaj bary z databázy (ak nie sú už v zozname)
      if (dbBars && dbBars.length > 0) {
        const newBars = dbBars.filter(
          (db: any) => !foundBars.some((f: any) => f.place_id === db.place_id)
        );
        foundBars.push(...newBars);
        console.log(`✅ Nájdených ${newBars.length} nových barov v Supabase (Spolu: ${foundBars.length})`);
        usedRadius = radius;
      }

      // Ak už máme dosť barov, preskočíme Google Places API
      if (foundBars.length >= MIN_BARS) {
        console.log(`✅ Máme ${foundBars.length} barov, končím hľadanie`);
        break;
      }

      // 3️⃣ Skúsim Google Places API
      console.log(`🌐 Hľadám cez Google Places API v radiuse ${radius}km...`);
      const googleRadius = radius * 1000; // Konverzia na metre
      const googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${googleRadius}&keyword=pub&key=${process.env.GOOGLE_API_KEY}`;

      const googleRes = await fetch(googleUrl);
      const googleData = await googleRes.json();

      if (googleData.status === "OK" && googleData.results && googleData.results.length > 0) {
        console.log(`✅ Google Places vrátil ${googleData.results.length} barov`);

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
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
            };
          })
        );

        // Pridaj len bary, ktoré ešte nemáme
        const newGoogleBars = bars.filter(
          (bar: any) => !foundBars.some((f: any) => f.place_id === bar.place_id)
        );
        foundBars.push(...newGoogleBars);
        console.log(`✅ Pridaných ${newGoogleBars.length} nových barov z Google (Spolu: ${foundBars.length})`);

        // 5️⃣ Uloženie nových barov do Supabase
        if (newGoogleBars.length > 0) {
          console.log(`💾 Ukladám ${newGoogleBars.length} nových barov do Supabase...`);

          const barsToInsert = newGoogleBars.map((bar: any) => ({
            place_id: bar.place_id,
            name: bar.name,
            address: bar.address,
            latitude: bar.latitude,
            longitude: bar.longitude,
            rating: bar.rating,
            open_now: bar.openNow,
            website: bar.website,
          }));

          const { error: insertError } = await supabase
            .from("bars")
            .upsert(barsToInsert, { onConflict: "place_id" });

          if (insertError) {
            console.error("Error saving bars to database:", insertError);
          } else {
            console.log("✅ Bary uložené do Supabase");
          }
        }

        usedRadius = radius;

        // Ak už máme dosť barov, končíme
        if (foundBars.length >= MIN_BARS) {
          console.log(`✅ Máme ${foundBars.length} barov, končím hľadanie`);
          break;
        }
      }
    }

    // Ak sme nič nenašli ani po všetkých pokusoch
    if (foundBars.length === 0) {
      return NextResponse.json(
        {
          bars: [],
          error: "Nenašli sa žiadne bary v okolí do 10km. Skúste inú lokalitu.",
          searchedRadius: 10
        },
        { status: 200 }
      );
    }

    // Vypočítaj vzdialenosti a vráť výsledky
    const barsWithDistance = foundBars.map((bar) => ({
      id: bar.id || bar.place_id,
      place_id: bar.place_id,
      name: bar.name,
      address: bar.address,
      rating: bar.rating,
      openNow: bar.openNow || bar.open_now,
      website: bar.website,
      distance: getDistanceFromLatLonInKm(
        userLat,
        userLng,
        parseFloat(bar.latitude),
        parseFloat(bar.longitude)
      ),
    }));

    return NextResponse.json({
      bars: barsWithDistance,
      source: foundBars[0].id ? "database" : "google_places",
      searchedRadius: usedRadius
    });
  } catch (err) {
    console.error("Chyba pri fetchovaní barov:", err);
    return NextResponse.json(
      { error: "Failed to fetch places", bars: [] },
      { status: 500 }
    );
  }
}