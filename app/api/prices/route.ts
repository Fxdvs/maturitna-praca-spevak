import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import Tesseract from "tesseract.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

const sampleDrinks = [
  "Pilsner Urquell",
  "Corona",
  "Guinness",
  "Stella Artois",
  "Heineken",
  "IPA",
  "Stout",
];

// ============================================
// WEB SCRAPER FUNKCIE
// ============================================

async function scrapeBarWebsite(barName: string, barUrl?: string): Promise<{
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
    return {
      drinkName:
        sampleDrinks[Math.floor(Math.random() * sampleDrinks.length)],
      price: parseFloat((Math.random() * 5 + 2).toFixed(2)),
      source: "generated",
    };
  } catch (error) {
    console.error(`Error scraping ${barName}:`, error);
    return {
      drinkName:
        sampleDrinks[Math.floor(Math.random() * sampleDrinks.length)],
      price: parseFloat((Math.random() * 5 + 2).toFixed(2)),
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

      // Fetch ceny z databázy
      const { data: prices } = await supabase
        .from("prices")
        .select("*")
        .in(
          "bar_id",
          dbBars.map((b: any) => b.id)
        );

      barsWithPrices = await Promise.all(
        dbBars.map(async (bar: any) => {
          const barPrice = prices?.find((p: any) => p.bar_id === bar.id);

          // Ak existuje cena v DB, použi ju
          if (barPrice) {
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
          const scrapedData = await scrapeBarWebsite(bar.name, bar.website);

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
          const scrapedData = await scrapeBarWebsite(bar.name);
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