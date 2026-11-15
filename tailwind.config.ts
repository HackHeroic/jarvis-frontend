import type { Config } from "tailwindcss";

// A theme colour as Tailwind needs it for opacity modifiers (`bg-terra/15`). The colours
// are CSS variables holding hex values, which Tailwind cannot add an alpha to, so a
// class with a modifier used to produce no CSS at all. `color-mix` applies the alpha in
// the browser; with no modifier the alpha is 1 and the colour is unchanged.
const tint = (variable: string) =>
  `color-mix(in srgb, var(${variable}) calc(<alpha-value> * 100%), transparent)`;

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
        terra: tint("--color-terra"),
        sage: tint("--color-sage"),
        dusk: tint("--color-dusk"),
        gold: tint("--color-gold"),
        ink: tint("--color-ink"),
        surface: {
          canvas: tint("--surface-canvas"),
          card: tint("--surface-card"),
          subtle: tint("--surface-subtle"),
          muted: tint("--surface-muted"),
        },
        border: {
          DEFAULT: tint("--border-default"),
          strong: tint("--border-strong"),
        },
      },
      // A bare `border` (or one whose colour class is not generated, e.g. an
      // opacity modifier on a var() colour) falls back to this. Tailwind's own
      // fallback is gray-200, which drew bright lines across the dark theme.
      borderColor: {
        DEFAULT: tint("--border-default"),
      },
      textColor: {
        primary: tint("--text-primary"),
        secondary: tint("--text-secondary"),
        muted: tint("--text-muted"),
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
