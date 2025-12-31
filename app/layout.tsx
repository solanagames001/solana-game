import "./globals.css";

import type { Metadata, Viewport } from 'next';

import Providers from "./providers";
import Header from "@/components/Header";
import RootBody from "@/components/RootBody";
import IntlProvider from "@/components/IntlProvider";
import { defaultLocale } from '@/i18n/config';

/* ============================================================
   SEO Configuration - Solana Game
   ============================================================ */

const APP_NAME = "Solana Game";
const APP_NAME_FULL = "Solana Game - Decentralized Matrix System";
const APP_DESCRIPTION = "Join the most transparent decentralized matrix system on Solana blockchain. Earn up to 60% rewards with 3-tier referral program. 16 levels, instant payouts, verified smart contracts.";
const APP_KEYWORDS = [
  "Solana",
  "SOL",
  "crypto",
  "blockchain",
  "matrix",
  "DeFi",
  "smart contracts",
  "referral program",
  "passive income",
  "decentralized",
  "Web3",
  "earn crypto",
  "Phantom wallet",
  "Solflare",
];
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://solanagame.io';
const TWITTER_HANDLE = "@solanagame";

/* ============================================================
   JSON-LD Structured Data
   ============================================================ */

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      "url": SITE_URL,
      "name": APP_NAME,
      "description": APP_DESCRIPTION,
      "publisher": {
        "@id": `${SITE_URL}/#organization`
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${SITE_URL}/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      },
      "inLanguage": "en-US"
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      "name": APP_NAME,
      "url": SITE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_URL}/icons/icon-512x512.png`,
        "width": 512,
        "height": 512
      },
      "sameAs": [
        "https://twitter.com/solanagame",
        "https://t.me/solanagame"
      ]
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#webapp`,
      "name": APP_NAME,
      "url": SITE_URL,
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "All",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "featureList": [
        "16 Matrix Levels",
        "60% Referral Rewards",
        "3-Tier Referral System",
        "Instant SOL Payouts",
        "Verified Smart Contracts",
        "Phantom Wallet Support"
      ]
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Solana Game?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Solana Game is a decentralized matrix system built on the Solana blockchain. It features 16 progressive levels with rewards up to 60% and a 3-tier referral program."
          }
        },
        {
          "@type": "Question",
          "name": "How do I start earning?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Connect your Solana wallet (Phantom or Solflare), create a player profile, and activate Level 1. You'll start earning from referrals and level completions."
          }
        },
        {
          "@type": "Question",
          "name": "What wallets are supported?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We support Phantom, Solflare, Backpack, and other Solana-compatible wallets through the Wallet Standard."
          }
        }
      ]
    }
  ]
};

/* ============================================================
   Metadata Export
   ============================================================ */

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: APP_NAME,
  
  // Title optimization
  title: {
    default: APP_NAME_FULL,
    template: `%s | ${APP_NAME}`,
  },
  
  // Description with keywords
  description: APP_DESCRIPTION,
  
  // Keywords for legacy SEO
  keywords: APP_KEYWORDS,
  
  // Author and creator
  authors: [{ name: APP_NAME, url: SITE_URL }],
  creator: APP_NAME,
  publisher: APP_NAME,
  
  // Robots directives
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  
  // Canonical and alternate
  alternates: {
    canonical: SITE_URL,
    languages: {
      "en-US": SITE_URL,
      "ru-RU": `${SITE_URL}?lang=ru`,
    },
  },
  
  // Format detection
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  
  // Category
  category: "Finance",
  
  // Open Graph - Telegram, Facebook, LinkedIn, Discord
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["ru_RU"],
    url: SITE_URL,
    siteName: APP_NAME,
    title: APP_NAME_FULL,
    description: APP_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        secureUrl: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: `${APP_NAME} - Earn SOL with Decentralized Matrix`,
        type: "image/png",
      },
    ],
    countryName: "Worldwide",
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    title: APP_NAME_FULL,
    description: APP_DESCRIPTION,
    images: {
      url: `${SITE_URL}/og-image.png`,
      alt: `${APP_NAME} - Decentralized Matrix on Solana`,
    },
  },
  
  // Verification (add your actual verification codes)
  verification: {
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  
  // App links
  appLinks: {
    web: {
      url: SITE_URL,
      should_fallback: true,
    },
  },
  
  // Icons (comprehensive)
  icons: {
    icon: [
      { url: "/logof.png", type: "image/png" },
      { url: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/logof.png",
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  
  // Manifest
  manifest: "/manifest.json",
  
  // Other meta tags
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": APP_NAME,
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#000000",
    "msapplication-config": "/browserconfig.xml",
  },
};

/* ============================================================
   Viewport Configuration
   ============================================================ */

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#14F195" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  colorScheme: "dark",
};

/**
 * RootLayout - Client component wrapper for static export.
 * Contains: html/body, NextIntlClientProvider, Providers, Header, RootBody
 * All client logic (wallet, tx, toast, overlay) lives inside Providers.
 * Locale is handled client-side for static export compatibility.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={defaultLocale} className="h-full dark" suppressHydrationWarning>
      <head>
        {/* JSON-LD Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        
        {/* Preconnect for performance - Critical resources */}
        <link rel="preconnect" href="https://api.mainnet-beta.solana.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://mainnet.helius-rpc.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.matomo.cloud" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.mainnet-beta.solana.com" />
        <link rel="dns-prefetch" href="https://mainnet.helius-rpc.com" />
        <link rel="dns-prefetch" href="https://solanagame.matomo.cloud" />
        
        {/* Preload critical assets */}
        <link 
          rel="preload" 
          href="/logo.png" 
          as="image" 
          type="image/png"
        />
        <link 
          rel="preload" 
          href="/fonts/montserrat/Montserrat-SemiBold.ttf" 
          as="font" 
          type="font/ttf" 
          crossOrigin="anonymous" 
        />
        
        {/* Security headers via meta tags */}
        {/* Note: X-Frame-Options must be set via HTTP header (configured in vercel.json) */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        
        {/* PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Geo targeting (optional) */}
        <meta name="geo.region" content="GLOBAL" />
        
        {/* Cache control hint */}
        <meta httpEquiv="Cache-Control" content="public, max-age=31536000, immutable" />
        
        {/* Matomo Analytics */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var _paq = window._paq = window._paq || [];
              _paq.push(['trackPageView']);
              _paq.push(['enableLinkTracking']);
              (function() {
                var u="https://solanagame.matomo.cloud/";
                _paq.push(['setTrackerUrl', u+'matomo.php']);
                _paq.push(['setSiteId', '1']);
                var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
                g.async=true; g.src='https://cdn.matomo.cloud/solanagame.matomo.cloud/matomo.js'; s.parentNode.insertBefore(g,s);
              })();
            `,
          }}
        />
      </head>

      <body className="relative min-h-screen min-h-[100dvh] bg-black text-white antialiased overflow-x-hidden">
        <IntlProvider>
          <Providers>
            {/* Header - auto-hides on dashboard routes */}
            <Header />

            {/* Main app body with safe area support */}
            <RootBody>{children}</RootBody>
          </Providers>
        </IntlProvider>
      </body>
    </html>
  );
}
