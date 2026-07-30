import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MkwanjaBet | Sportsbook Tanzania",
  description: "Secure wallet-backed sports betting, live events and transparent ticket tracking for Tanzania.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sw">
      <body>{children}</body>
    </html>
  );
}
