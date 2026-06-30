import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },

        // brand lavender scale
        brand: {
          50: "#f3f1fe",
          100: "#e9e5fd",
          200: "#d6cffb",
          300: "#bcaef7",
          400: "#a48cf2",
          500: "#8b6df0",
          600: "#7a55e8",
          700: "#6843cf",
          800: "#5739a7",
          900: "#483285",
        },
        // pastel surface palette (used for stat cards, badges, accents)
        pastel: {
          lavender: "#ede9fe",
          lavenderInk: "#5b4bb0",
          purple: "#e7defc",
          purpleInk: "#6c4fc7",
          pink: "#fce7f3",
          pinkInk: "#b3478a",
          rose: "#ffe4ea",
          roseInk: "#c14d63",
          sky: "#e0f2fe",
          skyInk: "#2f7bb0",
          mint: "#d9f7e8",
          mintInk: "#2f9468",
          cream: "#fef6da",
          creamInk: "#9a7b1f",
          apricot: "#ffe9d6",
          apricotInk: "#c0712f",
          coral: "#ffe1e0",
          coralInk: "#c5504c",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        card: "1.75rem",
      },
      boxShadow: {
        soft: "0 8px 30px -12px hsl(252 50% 60% / 0.22), 0 2px 8px -4px hsl(252 50% 60% / 0.12)",
        "soft-lg": "0 24px 60px -20px hsl(252 55% 55% / 0.28), 0 8px 20px -10px hsl(252 50% 55% / 0.16)",
        clay: "8px 8px 24px hsl(252 40% 80% / 0.45), -8px -8px 24px hsl(0 0% 100% / 0.9)",
        pill: "0 6px 18px -8px hsl(252 60% 55% / 0.45)",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease-out both",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
