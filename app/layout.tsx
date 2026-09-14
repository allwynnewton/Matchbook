import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Matchbook — Private Profile Organizer",
  description: "Privately save, organize and review matrimonial profiles."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
