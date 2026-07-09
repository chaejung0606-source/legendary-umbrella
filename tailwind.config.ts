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

        // brand lime-green scale
        brand: {
          50: "#f9fce9",
          100: "#f1f8cf",
          200: "#e5f2a6",
          300: "#d5ea75",
          400: "#c8e253",
          500: "#b6d332",
          600: "#97b422",
          700: "#74891d",
          800: "#5c6c1d",
          900: "#4d5a1d",
        },
        // 무광 세라믹 랜딩(/welcome) 전용 팔레트 — 기존 테마와 분리(추가 전용).
        ceramic: {
          pageBg: "#F3EDE3",
          surface: "#FFF9EF",
          surface2: "#F8F1E7",
          cream: "#EFE7DA",
          mint: "#AFCFC1",
          mintDark: "#8FB9A8",
          sky: "#B7D8E8",
          skySoft: "#D4E8EF",
          sage: "#9FB7A4",
          pink: "#EEC7C2",
          ink: "#2F3A37",
          sub: "#7C817B",
          line: "rgba(120, 110, 95, 0.12)",
        },
        // pastel surface palette (used for stat cards, badges, accents)
        // 슬롯 이름은 기존 톤 키를 유지하고, 값만 라임/그린 테마에 맞춰 재조정했다.
        pastel: {
          lavender: "#eef7c8", // lime (primary tone slot)
          lavenderInk: "#5f7514",
          purple: "#ddf2d3", // soft green
          purpleInk: "#3a7d42",
          pink: "#fcecf1",
          pinkInk: "#b3477e",
          rose: "#ffe6e9",
          roseInk: "#c14d60",
          sky: "#e1f2fb",
          skyInk: "#2f7bab",
          mint: "#d8f5e6",
          mintInk: "#2b8f64",
          cream: "#fdf5d8",
          creamInk: "#93761e",
          apricot: "#ffeddb",
          apricotInk: "#bb6f2f",
          coral: "#ffe3e1",
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
        soft: "0 8px 30px -12px hsl(84 30% 35% / 0.16), 0 2px 8px -4px hsl(84 30% 35% / 0.09)",
        "soft-lg": "0 24px 60px -20px hsl(84 32% 30% / 0.2), 0 8px 20px -10px hsl(84 30% 32% / 0.12)",
        clay: "8px 8px 24px hsl(80 24% 80% / 0.5), -8px -8px 24px hsl(0 0% 100% / 0.9)",
        pill: "0 6px 18px -8px hsl(72 60% 38% / 0.45)",
        // 무광 세라믹 뉴모피즘 그림자 (랜딩 전용, 추가)
        neu: "8px 8px 20px rgba(160, 140, 110, 0.16), -6px -6px 16px rgba(255, 255, 255, 0.75)",
        "neu-lg": "14px 14px 34px rgba(150, 130, 105, 0.18), -10px -10px 26px rgba(255, 255, 255, 0.82)",
        "neu-btn": "4px 4px 10px rgba(150, 130, 100, 0.18), -4px -4px 10px rgba(255, 255, 255, 0.8)",
        "neu-inset": "inset 4px 4px 8px rgba(150, 130, 100, 0.18), inset -4px -4px 8px rgba(255, 255, 255, 0.75)",
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
