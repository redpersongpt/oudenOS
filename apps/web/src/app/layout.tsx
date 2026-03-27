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
  title: "redcore — Premium Windows Performance Ecosystem",
  description:
    "Machine-aware optimization and in-place Windows transformation. Two precision instruments. One ecosystem.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "redcore — Premium Windows Performance Ecosystem",
    description:
      "Machine-aware optimization and in-place Windows transformation.",
    type: "website",
    locale: "en_US",
    images: ["/redcore-logo.png"],
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
      <body className="bg-surface-base text-ink-primary antialiased">
        <SessionProvider>
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
