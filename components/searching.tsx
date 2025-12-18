"use client";
import { motion } from "motion/react";

export default function Searching() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full"
    >
      <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-transparent bg-clip-text bg-linear-to-br from-neutral-100 to-neutral-300 py-5 italic text-center">
        Hľadáme najlepšie ponuky vo vašom okolí...
      </h2>
    </motion.div>
  );
}
