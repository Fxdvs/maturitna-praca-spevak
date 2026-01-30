"use client"
import { motion } from "motion/react";
import Link from "next/link";

export default function Footer() {
    return (
        <motion.div className="w-full h-12 flex items-center justify-end absolute bottom-0 px-5 gap-x-2"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3, delay: 1.4 }}
        >
                <Link className="text-2xl font-whisper text-neutral-50 hover:text-neutral-200 transition-colors duration-200" href={"https://spevak.dev/"} target="_blank">S</Link>
        </motion.div>
    )

}