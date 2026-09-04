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

// "only light", not "light". Both say the page is light, but only the `only` keyword opts
// out of a browser force-darkening it — which is what Android (Chrome auto dark theme,
// Samsung Internet dark mode) does to any page that has not explicitly refused.
export const viewport: Viewport = {
  colorScheme: "only light",
  // Keeps the browser's own chrome (Android address bar, task switcher) on the page's
  // background instead of letting it pick a dark tone of its own.
  themeColor: "#ffffff",
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
  // The inline color-scheme applies on first paint, before the stylesheet lands, but it has
  // to say "light only" to match globals.css. As a plain "light" it outranked the stylesheet
  // (inline styles win) and silently downgraded the opt-out, letting Android force-dark the
  // whole site.
  return (
    <html lang="en" style={{ colorScheme: "light only" }}>
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
