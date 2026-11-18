import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/lib/providers";
import { MotionConfig } from "motion/react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jarvis — Your Personal AI Study Companion",
  description: "Understand your course material, practice what you are learning, and make room for study with a personal AI learning companion.",
  openGraph: {
    title: "Jarvis — AI Study Companion",
    description: "A personal AI tutor for your course material, study habits and learning rhythm.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

// viewportFit "cover" lets env(safe-area-inset-*) resolve on notched phones.
// maximumScale stays above 1 so pinch-zoom keeps working.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8F5" },
    { media: "(prefers-color-scheme: dark)", color: "#211F1C" },
  ],
};

const themeScript = `(function(){var t=localStorage.getItem('jarvis-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches){document.documentElement.setAttribute('data-theme','dark')}else{document.documentElement.setAttribute('data-theme','light')}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <MotionConfig reducedMotion="user">
          <Providers>{children}</Providers>
        </MotionConfig>
      </body>
    </html>
  );
}
