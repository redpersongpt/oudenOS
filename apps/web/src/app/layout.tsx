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
    default: "redcore — Windows Optimization & Transformation Tools",
    template: "%s | redcore",
  },
  description:
    "Machine-aware Windows optimization and in-place transformation. redcore scans your hardware, builds a profile-specific plan, and applies reversible changes. Free OS transformation + $12.99 Tuning.",
  keywords: [
    "Windows optimizer",
    "Windows debloat tool",
    "Windows optimization software",
    "Windows tuning",
    "gaming PC optimization",
    "Work PC Windows optimizer",
    "Windows cleanup tool",
    "Windows transformation",
    "rollback-safe optimizer",
    "machine-aware optimization",
  ],
  authors: [{ name: "redcore" }],
  creator: "redcore",
  publisher: "redcore",
  icons: {
    icon: [{ url: "/redcore-logo.png", type: "image/png" }],
    shortcut: ["/redcore-logo.png"],
    apple: "/redcore-logo.png",
  },
  openGraph: {
    title: "redcore — Windows Optimization & Transformation Tools",
    description:
      "Scan your hardware. Build a plan. Transform your system. Free OS transformation + paid Tuning. 100% reversible.",
    type: "website",
    locale: "en_US",
    siteName: "redcore",
    url: "https://redcoreos.net",
    images: [
      {
        url: "/redcore-logo.png",
        width: 512,
        height: 512,
        alt: "redcore logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "redcore — Windows Optimization & Transformation Tools",
    description:
      "Machine-aware Windows optimization. Free OS transformation + $12.99 Tuning. 100% reversible.",
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
                "Machine-aware Windows optimization and transformation tools.",
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
