import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Förderprogramm-Finder | mpool Consulting",
  description: "Finden Sie passende Förderprogramme für Ihr Unternehmen",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
