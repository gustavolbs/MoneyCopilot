import type { Metadata, Viewport } from "next";

import { AppProviders } from "./_components/AppProviders";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL("https://carteira-bispo.vercel.app/"),
  title: {
    default: "MoneyCopilot",
    template: "%s | MoneyCopilot",
  },
  description: "PWA privado de gestão financeira offline-first.",
  manifest: "/manifest.webmanifest",
  applicationName: "MoneyCopilot",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MoneyCopilot",
  },
  openGraph: {
    type: "website",
    title: "MoneyCopilot",
    description: "PWA privado de gestão financeira offline-first.",
    siteName: "MoneyCopilot",
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: "MoneyCopilot" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MoneyCopilot",
    description: "PWA privado de gestão financeira offline-first.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#F7F7F2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// Splash screens de iOS (apple-touch-startup-image). Cada device precisa de uma media
// query com largura/altura em CSS px (= pixels / device-pixel-ratio) e o pixel-ratio.
const APPLE_SPLASH: { w: number; h: number; r: number }[] = [
  { w: 1290, h: 2796, r: 3 },
  { w: 1179, h: 2556, r: 3 },
  { w: 1284, h: 2778, r: 3 },
  { w: 1170, h: 2532, r: 3 },
  { w: 1125, h: 2436, r: 3 },
  { w: 1242, h: 2688, r: 3 },
  { w: 828, h: 1792, r: 2 },
  { w: 750, h: 1334, r: 2 },
  { w: 640, h: 1136, r: 2 },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      {APPLE_SPLASH.map(({ w, h, r }) => (
        <link
          key={`${w}-${h}`}
          rel="apple-touch-startup-image"
          href={`/splash/apple-splash-${w}-${h}.png`}
          media={`(device-width: ${w / r}px) and (device-height: ${h / r}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`}
        />
      ))}
      <body>
        <TooltipProvider>
          <AppProviders>{children}</AppProviders>
        </TooltipProvider>
      </body>
    </html>
  );
}
