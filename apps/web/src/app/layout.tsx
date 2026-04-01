import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://redcoreos.net"),
  title: {
    default: "redcore — Windows Optimization & Optimization Tools",
    template: "%s | redcore",
  },
  description:
    "Hardware-based Windows optimization and in-place optimization. redcore scans your hardware, builds a profile-specific plan, and applies reversible changes. Free OS optimization + $12.99 Tuning.",
  keywords: [
    "Windows optimizer",
    "Windows debloat tool",
    "Windows optimization software",
    "Windows tuning",
    "gaming PC optimization",
    "Work PC Windows optimizer",
    "Windows cleanup tool",
    "Windows optimization",
    "rollback-safe optimizer",
    "hardware-based optimization",
  ],
  authors: [{ name: "redcore" }],
  creator: "redcore",
  publisher: "redcore",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: ["/favicon.ico"],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "redcore — Windows Optimization & Optimization Tools",
    description:
      "Scan your hardware. Build a plan. Transform your system. Free OS optimization + paid Tuning. Every change undoable.",
    type: "website",
    locale: "en_US",
    siteName: "redcore",
    url: "https://redcoreos.net",
    images: [
      {
        url: "/redcore-logo.png",
        width: 1200,
        height: 360,
        alt: "redcore logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "redcore — Windows Optimization & Optimization Tools",
    description:
      "Hardware-based Windows optimization. Free OS optimization + $12.99 Tuning. Every change undoable.",
    images: ["/redcore-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: "https://redcoreos.net",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "redcore",
              url: "https://redcoreos.net",
              logo: "https://redcoreos.net/redcore-logo.png",
              description:
                "Hardware-based Windows optimization and optimization tools.",
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "redcore",
              url: "https://redcoreos.net",
            }),
          }}
        />
      </head>
      <body className="bg-surface-base text-ink-primary antialiased">
        <SessionProvider>
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
