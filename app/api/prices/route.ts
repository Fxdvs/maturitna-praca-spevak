import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import Tesseract from "tesseract.js";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

// ✅ Realistické ceny alkoholu v baroch na Slovensku (2026)
// Zdroj: kamnapivo.sk, closer.sme.sk, visitbratislava.com
const drinkPrices: Record<string, number> = {
  // PIVO (1.50€ - 2.50€)
  "Pilsner Urquell": 2.20,
  "Corona": 2.80,
  "Guinness": 3.20,
  "Stella Artois": 2.60,
  "Heineken": 2.50,
  "IPA": 2.90,
  "Zlatý Bažant": 1.80,
  "Corgoň": 1.70,
  "Šariš": 1.60,
  "Kelt": 1.50,

  // VÍNO (3.00€ - 5.50€ za pohár)
  "Červené víno": 3.50,
  "Biele víno": 3.20,
  "Rosé": 3.80,
  "Prosecco": 4.50,
  "Chardonnay": 4.20,
  "Merlot": 4.00,
  "Cabernet Sauvignon": 4.80,
  "Sauvignon Blanc": 3.90,

  // TVRDÝ ALKOHOL (6.00€ - 9.00€ za panák/50ml)
  "Vodka": 6.00,
  "Whiskey": 8.50,
  "Jack Daniels": 9.00,
  "Jameson": 8.00,
  "Rum": 6.50,
  "Bacardi": 7.00,
  "Gin": 7.50,
  "Bombay Sapphire": 8.50,
  "Tequila": 7.00,
  "Cognac": 12.00,
  "Brandy": 6.50,
  "Jägermeister": 6.00,
  "Becherovka": 5.50,

  // KOKTAILY (7.00€ - 14.00€)
  "Mojito": 7.50,
  "Margarita": 8.00,
  "Cosmopolitan": 9.00,
  "Old Fashioned": 10.00,
  "Martini": 9.50,
  "Negroni": 8.50,
  "Daiquiri": 7.50,
  "Piña Colada": 8.00,
  "Aperol Spritz": 7.00,
  "Manhattan": 10.50,
  "Sex on the Beach": 8.00,
  "Long Island Iced Tea": 9.00,
};

// ✅ Drink options based on type
const drinksByType: Record<string, string[]> = {
  beer: [
    "Pilsner Urquell",
    "Corona",
    "Guinness",
    "Stella Artois",
    "Heineken",
    "IPA",
    "Zlatý Bažant",
    "Corgoň",
    "Šariš",
    "Kelt",
  ],
  wine: [
    "Červené víno",
    "Biele víno",
    "Rosé",
    "Prosecco",
    "Chardonnay",
    "Merlot",
    "Cabernet Sauvignon",
    "Sauvignon Blanc",
  ],
  spirits: [
    "Vodka",
    "Whiskey",
    "Jack Daniels",
    "Jameson",
    "Rum",
    "Bacardi",
    "Gin",
    "Bombay Sapphire",
    "Tequila",
    "Cognac",
    "Brandy",
    "Jägermeister",
    "Becherovka",
  ],
  cocktails: [
    "Mojito",
    "Margarita",
    "Cosmopolitan",
    "Old Fashioned",
    "Martini",
    "Negroni",
    "Daiquiri",
    "Piña Colada",
    "Aperol Spritz",
    "Manhattan",
    "Sex on the Beach",
    "Long Island Iced Tea",
  ],
};

// ============================================
// WEB SCRAPER FUNKCIE
// ============================================

// Generuj realistický nápoj a jeho cenu podľa typu
function generateRealisticDrink(drinkType: string): { name: string; price: number } {
  const drinks = drinksByType[drinkType] || drinksByType.beer;
  const randomDrink = drinks[Math.floor(Math.random() * drinks.length)];
  const price = drinkPrices[randomDrink];

  // Malá variácia v cene (±10%) aby nebolo všade presne rovnaké
  const variance = price * 0.1;
  const finalPrice = price + (Math.random() * variance * 2 - variance);

  return {
    name: randomDrink,
    price: parseFloat(finalPrice.toFixed(2)),
  };
}

async function scrapeBarWebsite(
  barName: string,
  barUrl?: string,
  drinkType: string = "beer" // ✅ Pridaný drink type parameter
): Promise<{
  drinkName: string;
  price: number;
  source: "scraped" | "generated" | "ocr";
  photoUrl?: string;
  ocrText?: string;
}> {
  try {
    // Pokúšame sa hľadať bar na Google search
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(barName)} menu prices`;

    // ALTERNATIVA: Ak máme priamy URL na web stránku
    if (barUrl) {
      const response = await fetch(barUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);

        // Hľadaj ceny v HTML (regulárne výrazy)
        const priceMatch = html.match(/€\s*(\d+[.,]\d{2})/);
        if (priceMatch) {
          return {
            drinkName: "Pivo",
            price: parseFloat(priceMatch[1].replace(",", ".")),
            source: "scraped",
          };
        }

        // Hľadaj fotky a spúšťaj OCR
        const images = $("img").slice(0, 3); // Prvých 5 obrázkov
        
        for (let i = 0; i < images.length; i++) {
          const photoUrl = $(images[i]).attr("src");
          
          if (photoUrl && (photoUrl.includes("menu") || photoUrl.includes("price"))) {
            console.log(`🔍 Testing image for OCR: ${photoUrl}`);
            
            const ocrResult = await extractPriceFromImage(photoUrl);
            
            if (ocrResult.price) {
              return {
                drinkName: "Pivo",
                price: ocrResult.price,
                source: "ocr",
                photoUrl,
                ocrText: ocrResult.text,
              };
            }
          }
        }

        // Fallback: Vrátim prvú fotku
        const photoUrl = $("img").first().attr("src");
        if (photoUrl) {
          console.log(`🖼️ Trying OCR on image: ${photoUrl}`);
          const ocrResult = await extractPriceFromImage(photoUrl);
          
          if (ocrResult.price) {
            return {
              drinkName: "Pivo",
              price: ocrResult.price,
              source: "ocr",
              photoUrl,
              ocrText: ocrResult.text,
            };
          }
        }
      }
    }

    // Fallback: Vrátim generovanú cenu
    const generatedDrink = generateRealisticDrink(drinkType);
    return {
      drinkName: generatedDrink.name,
      price: generatedDrink.price,
      source: "generated",
    };
  } catch (error) {
    console.error(`Error scraping ${barName}:`, error);
    const generatedDrink = generateRealisticDrink(drinkType);
    return {
      drinkName: generatedDrink.name,
      price: generatedDrink.price,
      source: "generated",
    };
  }
}

// Extrahovať informácie z fotky pomocou OCR (Tesseract)
async function extractPriceFromImage(imageUrl: string): Promise<{
  price: number | null;
  text: string;
}> {
  try {
    console.log(`🖼️ Extracting text from image: ${imageUrl}`);

    // Stiahneme obrázok
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Spustíme Tesseract OCR
    const {
      data: { text },
    } = await Tesseract.recognize(buffer, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    console.log(`📝 Extracted text: ${text}`);

    // Hľadaj ceny v tvare: €2.50, $2.50, 2.50€
    const pricePatterns = [
      /€\s*(\d+[.,]\d{2})/g, // €2.50
      /\$\s*(\d+[.,]\d{2})/g, // $2.50
      /(\d+[.,]\d{2})\s*€/g, // 2.50€
      /(\d+[.,]\d{2})\s*SKK/g, // 2.50 SKK (pre Slovensko)
    ];

    for (const pattern of pricePatterns) {
      const matches = text.matchAll(pattern);
      const prices = Array.from(matches).map((match) =>
        parseFloat(match[1].replace(",", "."))
      );

      if (prices.length > 0) {
        const avgPrice =
          prices.reduce((a, b) => a + b, 0) / prices.length;
        console.log(`✅ Found prices from OCR: ${prices.join(", ")} EUR`);
        return {
          price: parseFloat(avgPrice.toFixed(2)),
          text: text.substring(0, 500),
        };
      }
    }

    console.log("❌ No prices found in OCR text");
    return {
      price: null,
      text: text.substring(0, 500),
    };
  } catch (error) {
    console.error("Error extracting price from image:", error);
    return {
      price: null,
      text: "",
    };
  }
}

// Porovnaj ceny a vyber najlacnejšiu
function findCheapestDrink(bars: any[]): any {
  const validPrices = bars.filter((bar) => bar.price && bar.price > 0);

  if (validPrices.length === 0) return bars[0];

  return validPrices.reduce((cheapest, current) => {
    const currentPrice = parseFloat(current.price);
    const cheapestPrice = parseFloat(cheapest.price);
    return currentPrice < cheapestPrice ? current : cheapest;
  });
}

// ============================================
// MAIN PRICES API
// ============================================

export async function POST(req: Request) {
  // ✅ Rate limiting check
  const clientIp = getClientIp(req);
  const rateLimitResult = await checkRateLimit(clientIp, "prices");

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: "Príliš veľa požiadaviek. Skúste znova neskôr.",
        resetAt: rateLimitResult.resetAt,
      },
      { status: 429 }
    );
  }

  try {
    const { bars, drinkType } = await req.json();

    if (!bars || bars.length === 0) {
      return NextResponse.json(
        { bars: [], error: "Missing bars" },
        { status: 400 }
      );
    }

    console.log(`🔍 Searching prices for ${bars.length} bars`);

    const barIds = bars.map((bar: any) => bar.place_id);

    // 1️⃣ Hľadaj v databáze
    const { data: dbBars, error: dbError } = await supabase
      .from("bars")
      .select("id, place_id, name, address, rating, open_now, latitude, longitude")
      .in("place_id", barIds);

    if (dbError) {
      console.error("Supabase error:", dbError);
      return NextResponse.json(
        { bars: [], error: "Database error" },
        { status: 500 }
      );
    }

    let barsWithPrices: any[] = [];

    // 2️⃣ Spracuj bary
    if (dbBars && dbBars.length > 0) {
      console.log(`✅ Found ${dbBars.length} bars in database`);

      // Fetch ceny z databázy pre daný drink type
      const { data: prices } = await supabase
        .from("prices")
        .select("*")
        .in(
          "bar_id",
          dbBars.map((b: any) => b.id)
        )
        .eq("drink_type", drinkType);

      barsWithPrices = await Promise.all(
        dbBars.map(async (bar: any) => {
          const barPrice = prices?.find((p: any) => p.bar_id === bar.id && p.drink_type === drinkType);

          // Ak existuje cena v DB, použi ju
          if (barPrice) {
            console.log(`✅ Using cached price for ${bar.name}`);
            return {
              id: bar.id,
              place_id: bar.place_id,
              name: bar.name,
              address: bar.address,
              rating: bar.rating,
              openNow: bar.open_now,
              distance:
                bars.find((b: any) => b.place_id === bar.place_id)?.distance ||
                0,
              drinkName: barPrice.drink_name,
              price: barPrice.price.toString(),
              source: "database",
            };
          }

          // Inak skúšaj web scraper + OCR
          console.log(`🕷️ Scraping website for ${bar.name}...`);
          const scrapedData = await scrapeBarWebsite(bar.name, bar.website, drinkType);

          // ✅ Ulož novu cenu do databázy
          if (scrapedData.source !== "generated") {
            console.log(`💾 Saving price for ${bar.name} to database...`);
            await supabase.from("prices").upsert({
              bar_id: bar.id,
              drink_name: scrapedData.drinkName,
              price: scrapedData.price,
              source: scrapedData.source,
              drink_type: drinkType,
            }, {
              onConflict: "bar_id,drink_type"
            });
          }

          return {
            id: bar.id,
            place_id: bar.place_id,
            name: bar.name,
            address: bar.address,
            rating: bar.rating,
            openNow: bar.open_now,
            distance:
              bars.find((b: any) => b.place_id === bar.place_id)?.distance || 0,
            drinkName: scrapedData.drinkName,
            price: scrapedData.price.toString(),
            source: scrapedData.source,
            photoUrl: scrapedData.photoUrl,
            ocrText: scrapedData.ocrText,
          };
        })
      );
    }

    // 3️⃣ Bary bez cien - web scraper
    const barsWithoutPrices = bars.filter(
      (b: any) => !dbBars?.some((dbB: any) => dbB.place_id === b.place_id)
    );

    if (barsWithoutPrices.length > 0) {
      console.log(`🆕 Scraping ${barsWithoutPrices.length} new bars...`);

      const scrapedBars = await Promise.all(
        barsWithoutPrices.map(async (bar: any) => {
          const scrapedData = await scrapeBarWebsite(bar.name, bar.website, drinkType); // ✅ Pridaný drinkType
          return {
            ...bar,
            drinkName: scrapedData.drinkName,
            price: scrapedData.price.toString(),
            source: scrapedData.source,
            photoUrl: scrapedData.photoUrl,
          };
        })
      );

      barsWithPrices.push(...scrapedBars);
    }

    // 4️⃣ Zoradí podľa ceny
    const sortedBars = barsWithPrices
      .filter((bar) => bar.price && bar.price !== "0" && bar.price !== "N/A")
      .sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price));

    // 5️⃣ Nájdi najlacnejšie pivo
    const cheapest = findCheapestDrink(sortedBars);

    console.log(
      `✅ Found ${sortedBars.length} bars. Cheapest: ${cheapest.name} - €${cheapest.price}`
    );

    return NextResponse.json({
      bars: sortedBars,
      cheapest: cheapest,
      stats: {
        totalBars: barsWithPrices.length,
        scrapedBars: barsWithPrices.filter((b) => b.source === "scraped")
          .length,
        ocrBars: barsWithPrices.filter((b) => b.source === "ocr").length,
        databaseBars: barsWithPrices.filter((b) => b.source === "database")
          .length,
        generatedBars: barsWithPrices.filter((b) => b.source === "generated")
          .length,
        averagePrice:
          sortedBars.length > 0
            ? (
                sortedBars.reduce(
                  (sum: any, bar: any) => sum + parseFloat(bar.price),
                  0
                ) / sortedBars.length
              ).toFixed(2)
            : 0,
      },
    });
  } catch (err) {
    console.error("Error in prices API:", err);
    return NextResponse.json(
      { bars: [], error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}