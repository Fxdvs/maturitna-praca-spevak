import type { Metadata } from "next";
import { Geist, Geist_Mono, Whisper } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const whisper = Whisper({
  variable: "--font-whisper",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "",
  description: "Aplikácia na vyhľadanie najlacnejšieho alkoholu v okolí",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${whisper.variable} antialiased bg-neutral-100 text-neutral-900`}
      >
        {children}
      </body>
    </html>
  );
}
