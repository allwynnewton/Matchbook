import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/service-worker-register";

export const metadata: Metadata = {
  title: "Matchbook — Private Profile Organizer",
  description: "Privately save, organize and review matrimonial profiles.",
  manifest: "/manifest.webmanifest",
  applicationName: "Matchbook",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Matchbook"
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#172b4d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
