import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SWRProvider from "@/providers/SWRProvider";
import PostHogProvider from "@/providers/PostHogProvider";
import { ImpostorBanner } from "@/components/ImpostorBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Light only — the app has no dark theme, so tell the UA not to invent one.
export const viewport: Viewport = {
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: "CompatibleFirst",
  description: "Compatibility-based matchmaking with transparent, two-sided scores.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PostHogProvider>
          <ImpostorBanner />
          <SWRProvider>{children}</SWRProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
