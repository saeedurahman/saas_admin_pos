import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = { title: "PakPOS Admin", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await headers(); // renders every page per request so Next can apply the CSP nonce from the middleware
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
