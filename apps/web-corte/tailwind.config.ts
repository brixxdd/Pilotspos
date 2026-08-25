import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "oklch(0.17 0.016 40)",
        "navy-dark": "oklch(0.23 0.02 40)",
        "blue-secondary": "oklch(0.72 0.12 78)",
        accent: "oklch(0.53 0.15 27)",
        "accent-hover": "oklch(0.48 0.15 27)",
        app: "oklch(0.975 0.008 75)",
        surface: "oklch(1 0 0)",
        ink: "oklch(0.2 0.02 40)",
        muted: "oklch(0.46 0.02 45)",
        line: "oklch(0.89 0.012 60)",
        success: "oklch(0.58 0.13 145)",
        danger: "oklch(0.53 0.16 25)",
        warning: "oklch(0.72 0.12 78)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
