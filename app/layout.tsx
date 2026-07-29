import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrimeOdds — Picks Bora za Mpira",
  description: "Picks za mpira, uchambuzi wa kina na matokeo yaliyo wazi kwa watumiaji wa Tanzania.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sw">
      <body>{children}</body>
    </html>
  );
}
