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
      },
    },
  },
  plugins: [],
};

export default config;
