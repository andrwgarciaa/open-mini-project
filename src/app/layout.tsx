import type { Metadata, Viewport } from "next";
import { Inter, DM_Mono } from "next/font/google";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Open | Smart Petrol Finder PWA",
  description:
    "Offline-first Australian petrol detour calculator. Find the cheapest local servos in Melbourne and determine if the detour is worth your time.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Open",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#19191a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#19191a] text-[#fafafa] selection:bg-[#ff5421]/30 selection:text-[#fcc880]">
        {children}
      </body>
    </html>
  );
}
