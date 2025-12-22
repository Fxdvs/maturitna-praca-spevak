"use client";
import options from "../lib/data/options";
import { motion } from "motion/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface SelectDrinkProps {
  onclick: (id: string) => void;
}

export default function SelectDrink({ onclick: onclick }: SelectDrinkProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.3, delay: 1.4 }}
      className="flex flex-col justify-center items-center gap-4 absolute z-10"
    >
      <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-transparent bg-clip-text bg-linear-to-br from-neutral-100 to-neutral-300 py-5 italic">
        Tvoj sprievodca drinkmi za najlepšiu cenu
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4  max-w-2xl">
        {options.map((option) => (
          <Tooltip key={option.id}>
            <TooltipTrigger asChild>
              <div
                key={option.id}
                className="size-16 bg-neutral-50/10 border border-neutral-50/5 backdrop-blur-lg shadow flex items-center justify-center text-3xl rounded-full hover:cursor-pointer"
                onClick={() => onclick(option.id)}
              >
                {option.icon}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{option.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </motion.div>
  );
}
