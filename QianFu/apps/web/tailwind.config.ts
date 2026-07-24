import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171513", panel: "#211e1a", paper: "#e7dfcd", muted: "#958b7a",
        copper: "#b97a45", alert: "#b84a3b", safe: "#687b61", line: "#3a342d",
      },
      fontFamily: { sans: ["Arial", "Noto Sans SC", "sans-serif"], serif: ["KaiTi", "STKaiti", "Noto Serif SC", "serif"] },
    },
  },
  plugins: [],
};
export default config;
