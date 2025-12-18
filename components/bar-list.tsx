"use client";

interface Bar {
  id: number;
  name: string;
  address: string;
  rating: number;
  openNow: boolean;
  distance: number;
  drinkName: string;
  price: number;
  icon: string;
}

interface BarListProps {
  bars: Bar[];
}

export default function BarList({ bars }: BarListProps) {
  if (!bars || bars.length === 0) {
    return <p className="text-center text-neutral-500">Žiadne bary nenájdené.</p>;
  }
  return (
    <div className="w-full max-w-3xl mx-auto p-4 flex flex-col gap-4">
      {bars.map((bar) => (
        <div
          key={bar.id}
          className="h-32 w-full bg-neutral-50 rounded-2xl shadow-md flex items-center px-5 gap-x-5 hover:shadow-lg transition cursor-pointer"
        >
          {/* Ikona nápoja */}
          <h1 className="text-5xl">{bar.icon}</h1>

          {/* Info o bare */}
          <div className="flex flex-col justify-center">
            <h2 className="text-2xl font-bold flex items-center gap-x-2">
              {bar.name} <span className="text-sm text-yellow-500 font-medium">⭐ {bar.rating}</span>
            </h2>
            <p className="text-sm text-neutral-500">
              {bar.address} - {bar.distance.toFixed(2)} km
            </p>
            <p className={bar.openNow ? "text-green-600 text-sm" : "text-red-500 text-sm"}>
              {bar.openNow ? "Otvorené" : "Zatvorené"}
            </p>
          </div>

          {/* Cena a názov drinku */}
          <div className="ml-auto text-right flex flex-col items-end justify-center gap-1">
            <p className="text-2xl font-bold">{bar.drinkName}</p>
            <span className="text-xl font-semibold text-green-600">{bar.price}€</span>
          </div>
        </div>
      ))}
    </div>
  );
}
