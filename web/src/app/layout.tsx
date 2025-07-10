// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ExtendedThemeProvider } from "@/components/common/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import "./globals.css";

// Load Google Fonts as fallback
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Metadata for SEO and PWA
export const metadata: Metadata = {
  title: {
    default: APP_CONFIG.NAME,
    template: `%s | ${APP_CONFIG.NAME}`,
  },
  description: APP_CONFIG.DESCRIPTION,
  keywords: [
    "whatsapp",
    "chat",
    "messaging",
    "realtime",
    "nextjs",
    "react",
    "typescript",
    "websocket",
  ],
  authors: [{ name: APP_CONFIG.AUTHOR }],
  creator: APP_CONFIG.AUTHOR,
  publisher: APP_CONFIG.AUTHOR,
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: APP_CONFIG.NAME,
    description: APP_CONFIG.DESCRIPTION,
    siteName: APP_CONFIG.NAME,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: APP_CONFIG.NAME,
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    title: APP_CONFIG.NAME,
    description: APP_CONFIG.DESCRIPTION,
    images: ["/og-image.png"],
    creator: "@your_twitter_handle",
  },

  // PWA manifest
  manifest: "/manifest.json",

  // App-specific metadata
  applicationName: APP_CONFIG.NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_CONFIG.NAME,
  },

  // Icons
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },

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
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(inter.variable)}
    >
      <head>
        {/* Preload critical resources */}
        <link
          rel="preload"
          href="/fonts/GeistVF.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
        <link
          rel="preload"
          href="/fonts/GeistMonoVF.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />

        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//cdn.jsdelivr.net" />

        {/* Preconnect to API */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL} />

        {/* Security headers via meta tags */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta
          httpEquiv="Strict-Transport-Security"
          content="max-age=31536000; includeSubDomains"
        />

        {/* Disable automatic phone number detection */}
        <meta name="format-detection" content="telephone=no" />

        {/* WebApp meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={APP_CONFIG.NAME} />

        {/* Microsoft Tiles */}
        <meta name="msapplication-TileColor" content="#00a884" />
        <meta name="msapplication-TileImage" content="/ms-icon-144x144.png" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>

      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          "overflow-hidden", // Prevent scroll on main body
          "selection:bg-primary/20 selection:text-primary-foreground"
        )}
        suppressHydrationWarning
      >
        {/* Theme Provider with custom WhatsApp themes */}
        <ExtendedThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
          storageKey="whatsapp-theme-mode"
        >
          {/* Tooltip Provider for all tooltips */}
          <TooltipProvider delayDuration={300}>
            {/* Main App Content */}
            <div className="relative flex h-screen w-full overflow-hidden">
              {children}
            </div>

            {/* Global Toast Notifications */}
            <Toaster
              position="top-right"
              expand={true}
              richColors
              closeButton
              toastOptions={{
                duration: 4000,
                className: cn(
                  "font-sans",
                  "backdrop-blur-sm",
                  "border-border/50"
                ),
              }}
            />
          </TooltipProvider>
        </ExtendedThemeProvider>

        {/* Performance monitoring script */}
        {process.env.NODE_ENV === "production" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Basic performance monitoring
                window.addEventListener('load', function() {
                  setTimeout(function() {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    if (perfData && perfData.loadEventEnd > 0) {
                      console.log('Page load time:', perfData.loadEventEnd - perfData.fetchStart, 'ms');
                    }
                  }, 0);
                });
                
                // Error tracking
                window.addEventListener('error', function(e) {
                  console.error('Global error:', e.error);
                });
                
                window.addEventListener('unhandledrejection', function(e) {
                  console.error('Unhandled promise rejection:', e.reason);
                });
              `,
            }}
          />
        )}

        {/* Service Worker Registration */}
        {process.env.NODE_ENV === "production" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js')
                      .then(function(registration) {
                        console.log('SW registered: ', registration);
                      })
                      .catch(function(registrationError) {
                        console.log('SW registration failed: ', registrationError);
                      });
                  });
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
