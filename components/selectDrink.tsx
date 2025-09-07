"use client";

import options from "./data/options";

interface SelectDrinkProps {
  onHover: (icon: string) => void;
  onClick: (id: string, icon: string) => void;
}

export default function SelectDrink({ onHover, onClick }: SelectDrinkProps) {
  return (
    <>
      {options.map((option) => (
        <button
          key={option.id} 
          onMouseEnter={() => onHover(option.icon)}
          onClick={() => onClick(option.id, option.icon)}
          className={`flex flex-col items-center justify-center p-5 rounded-2xl bg-neutral-50 shadow-md hover:shadow-lg hover:bg-${option.color}-50 transition cursor-pointer`}
        >
          <span className="text-4xl">{option.icon}</span>
          <span className="mt-2">{option.label}</span>
        </button>
      ))}
      
    </>
  );
}
