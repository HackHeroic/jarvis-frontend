"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#D4775A] flex items-center justify-center text-[#1C1A17] font-extrabold text-sm">
          J
        </div>
        <span className="text-[#FAF8F4] font-semibold text-lg">Jarvis</span>
      </div>

      <div className="flex items-center gap-6">
        <a
          href="#features"
          className="hidden md:block text-[#FAF8F4]/60 hover:text-[#FAF8F4] text-sm transition-colors"
        >
          Features
        </a>
        <a
          href="#how-it-works"
          className="hidden md:block text-[#FAF8F4]/60 hover:text-[#FAF8F4] text-sm transition-colors"
        >
          How it works
        </a>
        <a
          href="#pricing"
          className="hidden md:block text-[#FAF8F4]/60 hover:text-[#FAF8F4] text-sm transition-colors"
        >
          Pricing
        </a>
        <Link
          href="/dashboard"
          className="bg-[#D4775A] text-[#1C1A17] font-semibold text-sm px-4 py-2 rounded-lg hover:bg-[#D4775A]/90 transition-colors"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}
