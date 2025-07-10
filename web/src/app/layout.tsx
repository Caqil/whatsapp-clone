// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "WhatsApp Clone",
    template: "%s | WhatsApp Clone",
  },
  description: "A real-time messaging application built with Next.js and Go",
  keywords: [
    "chat",
    "messaging",
    "real-time",
    "whatsapp",
    "nextjs",
    "golang",
    "websocket",
  ],
  authors: [
    {
      name: "WhatsApp Clone Team",
    },
  ],
  creator: "WhatsApp Clone Team",
  publisher: "WhatsApp Clone",

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "http://localhost:3000",
    title: "WhatsApp Clone",
    description: "A real-time messaging application",
    siteName: "WhatsApp Clone",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "WhatsApp Clone",
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Clone",
    description: "A real-time messaging application",
    images: ["/og-image.png"],
    creator: "@whatsappclone",
  },

  // Icons
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },

  // PWA (commented out to prevent 404)
  // manifest: "/manifest.json",

  // Other metadata
  category: "communication",
  classification: "messaging app",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// Viewport configuration
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#00a884" },
    { media: "(prefers-color-scheme: dark)", color: "#00a884" },
  ],
  colorScheme: "light dark",
  viewportFit: "cover",
};

// Root layout component
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(inter.variable)}>
      <head>
        {/* Security headers via meta tags */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta
          httpEquiv="Strict-Transport-Security"
          content="max-age=31536000; includeSubDomains"
        />

        {/* Preconnect to API */}
        <link
          rel="preconnect"
          href={process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}
        />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.className
        )}
      >
        <div id="root" className="relative flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
