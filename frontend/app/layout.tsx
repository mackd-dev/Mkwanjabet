import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://46.225.136.147:3010"),
  title: "MkwanjaBet | Sportsbook Tanzania",
  description: "Secure wallet-backed sports betting, live events and transparent ticket tracking for Tanzania.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/brand/favicons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicons/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/favicons/favicon-180.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "MkwanjaBet",
    description: "Play smart. Win big with wallet-backed sports betting in Tanzania.",
    images: ["/brand/social_icons/banner-twitter.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#006B2F",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sw">
      <body>{children}</body>
    </html>
  );
}
