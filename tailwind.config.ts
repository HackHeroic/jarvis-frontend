import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        terra: "var(--color-terra)",
        sage: "var(--color-sage)",
        dusk: "var(--color-dusk)",
        gold: "var(--color-gold)",
        ink: "var(--color-ink)",
        surface: {
          canvas: "var(--surface-canvas)",
          card: "var(--surface-card)",
          subtle: "var(--surface-subtle)",
          muted: "var(--surface-muted)",
        },
        border: {
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
        },
      },
      textColor: {
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
      },
      fontFamily: {
        display: ["var(--font-inter)", "Inter", "sans-serif"],
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        sm: "0 1px 2px rgba(44,41,36,0.06)",
        md: "0 2px 8px rgba(44,41,36,0.08)",
        lg: "0 8px 24px rgba(44,41,36,0.12)",
        "glow-terra": "0 0 20px rgba(212,119,90,0.15)",
        "glow-dusk": "0 0 12px rgba(107,127,181,0.12)",
      },
      borderRadius: {
        card: "12px",
        button: "8px",
        pill: "20px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
