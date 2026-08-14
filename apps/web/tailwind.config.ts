import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0B3557",
        "navy-dark": "#082A45",
        "blue-secondary": "#164E70",
        accent: "#FF7417",
        "accent-hover": "#E9650C",
        app: "#F5F7FA",
        ink: "#172033",
        muted: "#6B7280",
        line: "#D9E0E7",
        success: "#16A34A",
        danger: "#DC2626",
        warning: "#D97706",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
