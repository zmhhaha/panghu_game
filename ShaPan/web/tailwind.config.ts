import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111613",
        panel: "#1b211e",
        panelRaised: "#222a26",
        paper: "#e4e7df",
        muted: "#9aa49b",
        line: "#354039",
        copper: "#b78a5a",
        alert: "#c86458",
        field: "#73856e",
        blueMark: "#7296b8"
      },
      fontFamily: {
        sans: ["Arial", "Noto Sans SC", "sans-serif"],
        serif: ["KaiTi", "STKaiti", "Noto Serif SC", "serif"]
      },
      boxShadow: { insetPaper: "inset 0 0 0 1px rgba(228,231,223,.08)" }
    }
  },
  plugins: []
};

export default config;
