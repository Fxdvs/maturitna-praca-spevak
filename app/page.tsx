"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import Preloader from "@/components/preloader";
import Alert from "@/components/alert";
import SelectDrink from "@/components/selectDrink";
import BarList from "@/components/barList";

export default function Home() {
  const [currentIcon, setCurrentIcon] = useState("🍺");

  const [searching, setSearching] = useState(false);
  const [searchingResult, setSearchingResult] = useState(false);

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const [barsResult, setBarsResult] = useState([]);

  const handleSearch = (drinkType: string, drinkIcon: string) => {
    if ("geolocation" in navigator) {
      setShowAlert(true);
      setAlertMessage(
        "Potrebujeme prístup k vašej polohe, aby sme našli najlepšie ponuky vo vašom okolí."
      );
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setShowAlert(false);
          setSearching(true);

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
                drinkType, // typ nápoja, ktorý užívateľ vybral
                bars: barsData.bars, // zoznam barov z predchádzajúceho fetch
              }),
            });
            const pricesData = await pricesRes.json();
            console.log("Prices API response:", pricesData);

            // 3️⃣ Pridáme icon ku každému baru
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const barsWithIcon = pricesData.bars.map((bar: any) => ({
              ...bar,
              icon: drinkIcon,
            }));

            console.log("Bars with icon:", barsWithIcon);
            setBarsResult(barsWithIcon);
          } catch (error) {
            console.error("Chyba pri fetchovaní barov alebo cien:", error);
          }

          setSearching(false);
          setSearchingResult(true);
        },
        (error) => {
          setAlertMessage("Chyba pri získavaní polohy: " + error.message);
        }
      );
    } else {
      setAlertMessage("Geolokácia nie je podporovaná vo vašom prehliadači.");
    }
  };

  return (
    <>
      <Preloader />
      <AnimatePresence>
        {showAlert && <Alert message={alertMessage} />}
        {!searching && !searchingResult && (
          <motion.div
            key="selecting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="h-screen w-full flex flex-col justify-center items-center gap-4 text-center"
          >
            <AnimatePresence mode="wait">
              <motion.h1
                key={currentIcon}
                className="text-7xl"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {currentIcon}
              </motion.h1>
            </AnimatePresence>
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900">
              Tvoj sprievodca drinkmi za najlepšiu cenu!
            </h2>
            <h3 className="text-2xl text-neutral-900">Na čo máš dnes chuť?</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
              <SelectDrink
                onHover={setCurrentIcon}
                onClick={(drinkType, drinkIcon) => handleSearch(drinkType, drinkIcon)}
              />
            </div>
          </motion.div>
        )}
        {searching && !searchingResult && (
          <motion.div
            key="searching"
            className="h-screen w-full flex flex-col justify-center items-center text-4xl md:text-5xl font-bold text-neutral-900"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            Hľadáme najlepšie ponuky vo vašom okolí...
          </motion.div>
        )}
        {!searching && searchingResult && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="h-screen w-full flex flex-col justify-center items-center"
          >
            <BarList bars={barsResult}/>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
