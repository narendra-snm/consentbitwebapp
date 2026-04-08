import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DM_Sans } from "next/font/google";
import "react-datepicker/dist/react-datepicker.css";
import {AppProvider} from "./context/AppProvider"
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
});
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ConsentBit",
  description: "Consent management platform",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};
// eslint-disable-next-line react/prop-types
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">

      <body
        className={`${dmSans.className} antialiased`}
      >
        <AppProvider>{children}</AppProvider>
        
       
      </body>
    </html>
  );
}
