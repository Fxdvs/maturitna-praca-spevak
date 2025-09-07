"use client"
import { motion } from "motion/react";

interface AlertProps {
  message: string;
}
export default function Alert({ message }: AlertProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.15 }}
      className="fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-neutral-50 text-neutral-900 px-4 py-2 rounded-lg shadow-md"
    >
        {message}
    </motion.div>
  );
}