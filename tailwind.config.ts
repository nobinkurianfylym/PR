import type { Config } from "tailwindcss";

/**
 * PR.FYLYM design tokens — dark-first, monochrome, no gradients. The palette
 * is deliberately tiny: two surfaces, two text colors, one border, one accent
 * (white). Premium comes from spacing and typography, not decoration.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tokens resolve from CSS variables so a theme can be swapped per
        // scope (dark app shell, light public fan page) without touching any
        // utility class. The `<alpha-value>` slot keeps /opacity modifiers.
        background: "hsl(var(--background) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        raised: "hsl(var(--raised) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        faint: "hsl(var(--faint) / <alpha-value>)",
        // Warm brass accent for the public fan page.
        gold: {
          DEFAULT: "#b78a34",
          soft: "#c9a24e",
          deep: "#8a6620",
        },
        // Deep espresso panels on the fan page (dark blocks over cream).
        espresso: "#241d13",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },
      // Warm-tinted, layered elevation system for the cream fan page — soft and
      // premium rather than harsh drop shadows.
      boxShadow: {
        soft: "0 1px 2px rgba(40, 30, 15, 0.04), 0 2px 8px -2px rgba(40, 30, 15, 0.06)",
        card: "0 1px 2px rgba(40, 30, 15, 0.04), 0 10px 30px -14px rgba(40, 30, 15, 0.16)",
        elevated:
          "0 2px 6px rgba(40, 30, 15, 0.05), 0 18px 40px -16px rgba(40, 30, 15, 0.18)",
        cinematic:
          "0 8px 20px rgba(20, 14, 6, 0.10), 0 40px 80px -24px rgba(20, 14, 6, 0.35)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
