"use client"
import { motion } from "motion/react";

interface AlertProps {
  message: string;
}
export default function Alert({ message }: AlertProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-neutral-50/10 border border-neutral-50/5 backdrop-blur-lg text-neutral-100 px-4 py-1.5 rounded-full shadow-md z-1000"
    >
        {message}
    </motion.div>
  );
}