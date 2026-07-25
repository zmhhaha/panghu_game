import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#151817", panel: "#1d2220", paper: "#e5e8e4", muted: "#929b96",
        copper: "#76a7a1", alert: "#c45d57", safe: "#769579", line: "#343b38",
      },
      fontFamily: { sans: ["Arial", "Noto Sans SC", "sans-serif"], serif: ["KaiTi", "STKaiti", "Noto Serif SC", "serif"] },
    },
  },
  plugins: [],
};
export default config;
