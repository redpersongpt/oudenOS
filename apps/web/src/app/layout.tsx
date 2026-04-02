import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
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
      "Scan your hardware. Build a plan. Transform your system. Free OS optimization + paid Tuning",
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
      "Hardware-based Windows optimization. Free OS optimization + $12.99 Tuning",
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
      className={`${spaceGrotesk.variable} ${spaceMono.variable}`}
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
      <body className="bg-bg text-ink-primary antialiased">
        <SessionProvider>
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
