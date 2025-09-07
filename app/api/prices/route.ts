import { NextResponse } from "next/server";

// Malý zoznam možných názvov drinkov pre test
const sampleDrinks = ["Pilsner", "IPA", "Stout", "Merlot", "Whisky", "Cocktail"];

export async function POST(req: Request) {
  try {
    const { drinkType, bars } = await req.json();

    if (!drinkType || !bars || bars.length === 0) {
      return NextResponse.json(
        { bars: [], error: "Missing drinkType or bars" },
        { status: 400 }
      );
    }

    // Pre každý bar pridáme náhodný drinkName a price
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const barsWithPrices = bars.map((bar: any) => ({
      ...bar,
      drinkName: sampleDrinks[Math.floor(Math.random() * sampleDrinks.length)],
      price: (Math.random() * 5 + 2).toFixed(2), // cena od 2€ do 7€
    }));

    return NextResponse.json({ bars: barsWithPrices });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { bars: [], error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
