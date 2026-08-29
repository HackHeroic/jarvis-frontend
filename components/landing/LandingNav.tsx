"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import JarvisLogo from "./JarvisLogo";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 md:px-12 transition-all duration-300 ${
        scrolled
          ? "bg-[#1C1A17]/90 backdrop-blur-md border-b border-[#FAF8F4]/10"
          : "bg-transparent"
      }`}
    >
      <Link href="/" aria-label="Jarvis home">
        <JarvisLogo size="md" wordmark={true} animated reactToScroll />
      </Link>

      <div className="flex items-center gap-7 font-mono text-[11px] tracking-[1px]">
        <a
          href="#how-it-works"
          className="hidden md:inline text-[#FAF8F4]/55 hover:text-[#FAF8F4] transition-colors"
        >
          how
        </a>
        <a
          href="#why"
          className="hidden md:inline text-[#FAF8F4]/55 hover:text-[#FAF8F4] transition-colors"
        >
          why
        </a>
        <a
          href="#pricing"
          className="hidden md:inline text-[#FAF8F4]/55 hover:text-[#FAF8F4] transition-colors"
        >
          pricing
        </a>
        <Link
          href="/dashboard"
          className="text-[#D4775A] hover:text-[#E09D5C] transition-colors"
        >
          begin →
        </Link>
      </div>
    </nav>
  );
}
