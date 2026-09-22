import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/lib/providers";
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
  title: "Jarvis — Your Brain Dump Becomes Your Plan | AI Study Scheduler",
  description: "Stop managing your productivity. Tell Jarvis what's stressing you and watch it create an optimized study schedule. AI-powered, anti-guilt, built for students.",
  openGraph: {
    title: "Jarvis — AI-Powered Study Scheduler",
    description: "Your brain dump becomes your plan. AI scheduling that adapts to you.",
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
    { media: "(prefers-color-scheme: light)", color: "#FAF8F4" },
    { media: "(prefers-color-scheme: dark)", color: "#1C1A17" },
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
