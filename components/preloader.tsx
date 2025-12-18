"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

import options from "../lib/data/options";

export default function Preloader() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadingTime = options.length * 150 + 500; 
    const loading = setTimeout(() => {
      setLoading(false);
    }, loadingTime);

    return () => clearTimeout(loading);
  }, []);

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  };

  const iconVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          className="h-screen w-full flex justify-center items-center gap-x-8 absolute top-0 left-0 z-1000"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {options.map((option) => (
            <motion.h1
              key={option.id}
              className="text-5xl"
              variants={iconVariants}
            >
              {option.icon}
            </motion.h1>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
