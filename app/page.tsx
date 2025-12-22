"use client";
import PixelBlast from "@/components/pixel-blast";
import Preloader from "@/components/preloader";
import Navbar from "@/components/navbar";
import Alert from "@/components/alert";
import SelectDrink from "@/components/select-drink";
import Searching from "@/components/searching";
import SearchResult from "@/components/search-result";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export default function Page() {
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(false);
  const [result, setResult] = useState([]);

  function handleSearch(id: string) {
    const options = {
      enableHighAccuracy: true, // Vyžaduje GPS namiesto WiFi/IP
      timeout: 15000, // Max 15 sekúnd čakania
      maximumAge: 0, // Vždy získa novú polohu, nie cache
    };

    if ("geolocation" in navigator) {
      setShowAlert(true);
      setAlertMessage("Získavam presnú GPS polohu...");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          const accuracy = position.coords.accuracy;

          console.log("User coordinates:", coords);
          console.log("GPS Accuracy:", accuracy, "meters");

          // ✅ Validácia presnosti - ak je presnosť horšia ako 100m, upozorni používateľa
          if (accuracy > 100) {
            setAlertMessage(
              `⚠️ Nízka presnosť GPS (${Math.round(
                accuracy
              )}m). Výsledky nemusia byť presné. Skúste sa presunúť von alebo povoliť presnú lokalizáciu.`
            );
            // Počkáme 3 sekundy, aby používateľ videl upozornenie
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }

          setShowAlert(false);
          setSearching(true);
          await new Promise((resolve) => setTimeout(resolve, 3000));

          setSearching(false);
          setSearchResult(true);

          try {
            // 1️⃣ Zavoláme /api/bars
            const barsRes = await fetch(
              `/api/bars?lat=${coords.lat}&lng=${coords.lng}`
            );
            const barsData = await barsRes.json();
            console.log("Bars API response:", barsData);

            // 2️⃣ Zavoláme /api/prices s drinkType a zoznamom barov
            const pricesRes = await fetch("/api/prices", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bars: barsData.bars, // zoznam barov z predchádzajúceho fetch
                drinkType: id,
              }),
            });
            const pricesData = await pricesRes.json();
            console.log("Prices API response:", pricesData);

            // 3️⃣ Pridáme icon ku každému baru
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const barsWithIcon = pricesData.bars.map((bar: any) => ({
              ...bar,
            }));

            console.log("Bars with icon:", barsWithIcon);
            setResult(barsWithIcon);
          } catch (error) {
            console.error("Chyba pri fetchovaní barov alebo cien:", error);
            setShowAlert(true);
            setAlertMessage("Chyba pri hľadaní barov. Skúste to znova.");
          }
          setSearching(false);
          setSearchResult(true);
        },
        (error) => {
          setShowAlert(true);
          let errorMsg = "❌ ";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg +=
                "Prístup k polohe bol zamietnutý. Povoľte lokalizáciu v nastaveniach prehliadača.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg +=
                "GPS signál nie je dostupný. Skúste sa presunúť von alebo reštartujte aplikáciu.";
              break;
            case error.TIMEOUT:
              errorMsg +=
                "GPS signál trvá príliš dlho. Skúste to znova alebo sa presuňte na miesto s lepším signálom.";
              break;
            default:
              errorMsg += "Chyba pri získavaní polohy: " + error.message;
          }
          setAlertMessage(errorMsg);
          setSearching(false);
        },
        options
      );
    } else {
      setShowAlert(true);
      setAlertMessage("❌ Geolokácia nie je podporovaná vo vašom prehliadači.");
    }
  }
  return (
    <section className="h-screen w-full relative bg-[#191529] flex justify-center items-center">
      <Preloader />
      <AnimatePresence>
        {showAlert && <Alert message={alertMessage} />}
      </AnimatePresence>
      <Navbar />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="size-full"
      >
        <PixelBlast
          variant="circle"
          pixelSize={7}
          color="#B19EEF"
          patternScale={3}
          patternDensity={1.2}
          pixelSizeJitter={0.5}
          speed={0.6}
          edgeFade={0.25}
          transparent
        />
      </motion.div>
      <AnimatePresence mode="wait">
        {!searching && !searchResult && (
          <SelectDrink key="select-drink" onclick={handleSearch} />
        )}
        {searching && !searchResult && <Searching key="searching" />}
        {searchResult && <SearchResult key="search-result" bars={result} />}
      </AnimatePresence>
    </section>
  );
}
