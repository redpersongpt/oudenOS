import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono, Doto } from "next/font/google";
import "./globals.css";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { StarField } from "@/components/ui/StarField";

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

const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ouden.cc"),
  title: {
    default: "Ouden — Windows Optimization",
    template: "%s | Ouden",
  },
  description:
    "Hardware-based Windows optimization and in-place optimization. Ouden scans your hardware, builds a profile-specific plan, and applies reversible changes. Free OS optimization + paid Tuning.",
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
  authors: [{ name: "Ouden" }],
  creator: "Ouden",
  publisher: "Ouden",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: ["/favicon.ico"],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Ouden — Windows Optimization",
    description:
      "Scan your hardware. Build a plan. Transform your system. Free OS optimization + paid Tuning",
    type: "website",
    locale: "en_US",
    siteName: "Ouden",
    url: "https://ouden.cc",
    images: [
      {
        url: "/og-image.png",
        width: 1280,
        height: 640,
        alt: "OudenOS — Windows Optimization",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ouden — Windows Optimization",
    description:
      "Hardware-based Windows optimization. Free OS optimization + paid Tuning",
    images: ["/og-image.png"],
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
    canonical: "https://ouden.cc",
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
      className={`${spaceGrotesk.variable} ${spaceMono.variable} ${doto.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Ouden",
              url: "https://ouden.cc",
              logo: "https://ouden.cc/redcore-logo.png",
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
              name: "Ouden",
              url: "https://ouden.cc",
            }),
          }}
        />
      </head>
      <body className="bg-[var(--black)] text-[var(--text-primary)] antialiased">
        <StarField />
        <SessionProvider>
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
