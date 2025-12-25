"use client";
import { motion } from "motion/react";
import { useState, useEffect } from "react";

interface Bar {
  id: string;
  name: string;
  address: string;
  rating: number;
  openNow: boolean;
  distance: number;
  drinkName: string;
  price: string;
}

export default function SearchResult({ bars = [] }: { bars: Bar[] }) {
  const [filter, setFilter] = useState<
    "distance" | "price" | "open" | "rating"
  >("distance");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Získaj userovu polohu pri prvom zaťažení
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      });
    }
  }, []);

  const handleNavigateToBar = (bar: Bar) => {
    if (!userLocation) {
      alert("Nepodarilo sa získať vašu polohu. Skúste to znova.");
      return;
    }

    // Vytvor Google Maps URL s trasou od useroveho miesta k baru
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${encodeURIComponent(bar.address)}&travelmode=walking`;

    window.open(googleMapsUrl, "_blank");
  };

  const sortedBars = [...bars].sort((a, b) => {
    switch (filter) {
      case "distance":
        return a.distance - b.distance;
      case "price":
        return parseFloat(a.price) - parseFloat(b.price);
      case "open":
        return b.openNow ? 1 : -1;
      case "rating":
        return b.rating - a.rating;
      default:
        return 0;
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="h-screen w-full absolute top-0 left-0 flex flex-col gap-4 py-8 px-4 overflow-y-auto"
    >
      <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-transparent bg-clip-text bg-linear-to-br from-neutral-100 to-neutral-300 py-5 text-center">
        Výsledky vyhľadávania
      </h1>

      {/* Filter Buttons */}
      <div className="w-full flex justify-center mb-4">
        <div className="w-full max-w-2xl flex gap-3">
          <motion.button
            onClick={() => setFilter("distance")}
            className={`flex-1 px-4 py-2 rounded-full font-semibold transition-all text-sm ${
              filter === "distance"
                ? "bg-[#B19EEF] text-white"
                : "bg-neutral-50/10 text-neutral-50 border border-neutral-50/10 hover:bg-neutral-50/15 cursor-pointer backdrop-blur-lg"
            }`}
          >
            📍 Najbližšie
          </motion.button>
          <motion.button
            onClick={() => setFilter("price")}
            className={`flex-1 px-4 py-2 rounded-full font-semibold transition-colors duration-300 text-sm ${
              filter === "price"
                ? "bg-[#B19EEF] text-white border-none backdrop-blur-lg"
                : "bg-neutral-50/10 text-neutral-50 border border-neutral-50/10 hover:bg-neutral-50/15 cursor-pointer backdrop-blur-lg"
            }`}
          >
            💰 Najlacnejšie
          </motion.button>
          <motion.button
            onClick={() => setFilter("open")}
            className={`flex-1 px-4 py-2 rounded-full font-semibold transition-all text-sm ${
              filter === "open"
                ? "bg-[#B19EEF] text-white border-none backdrop-blur-lg"
                : "bg-neutral-50/10 text-neutral-50 border border-neutral-50/10 hover:bg-neutral-50/15 cursor-pointer backdrop-blur-lg"
            }`}
          >
            🟢 Otvorené
          </motion.button>
          <motion.button
            onClick={() => setFilter("rating")}
            className={`flex-1 px-4 py-2 rounded-full font-semibold transition-all text-sm ${
              filter === "rating"
                ? "bg-[#B19EEF] text-white border-none backdrop-blur-lg"
                : "bg-neutral-50/10 text-neutral-50 border border-neutral-50/10 hover:bg-neutral-50/15 cursor-pointer backdrop-blur-lg"
            }`}
          >
            ⭐ Najlepšie
          </motion.button>
        </div>
      </div>

      <div className="w-full flex justify-center flex-1 overflow-y-auto">
        <div className="w-full max-w-2xl space-y-4">
          {sortedBars && sortedBars.length > 0 ? (
            sortedBars.map((bar, index) => (
              <motion.div
                key={bar.id || index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={() => handleNavigateToBar(bar)}
                className="bg-neutral-50/10 border border-neutral-50/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-neutral-50/15 hover:border-neutral-50/15 transition-all cursor-pointer hover:shadow-lg"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-50">
                      {bar.name}
                    </h2>
                    <p className="text-sm text-neutral-400 mt-1">
                      {bar.address}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-[#B19EEF]">
                      €{bar.price}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {bar.drinkName}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-3">
                    {bar.rating > 0 && (
                      <span className="text-sm bg-neutral-50/10 px-3 py-1 rounded-full text-neutral-50">
                        ⭐ {bar.rating.toFixed(1)}
                      </span>
                    )}
                    <span
                      className={`text-sm px-3 py-1 rounded-full ${
                        bar.openNow
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {bar.openNow ? "🟢 Otvorené" : "🔴 Zatvorené"}
                    </span>
                  </div>
                  {bar.distance && (
                    <span className="text-sm text-neutral-400">
                      📍 {bar.distance.toFixed(1)} km
                    </span>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-neutral-50/10 border border-neutral-50/10 backdrop-blur-lg rounded-2xl p-8 text-center"
            >
              <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-transparent bg-clip-text bg-linear-to-br from-neutral-100 to-neutral-300 py-5 text-center">
                Žiadne bary nenájdené
              </h1>
              <p className="text-neutral-400 mt-2">Skúste to v inej lokalite</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}