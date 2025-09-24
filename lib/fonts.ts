import { Geist, Geist_Mono, Special_Elite } from "next/font/google";

export const specialElite = Special_Elite({
    subsets: ['latin'],
    weight: ['400'],
})

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});