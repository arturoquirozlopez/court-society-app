import type { Config } from "tailwindcss";

// Court Society design tokens — ported from prototype `C = { ... }`.
const colors = {
  ivory: "#F5F1E8",
  green: "#0E2A1F",
  greenLight: "#1a3d2b",
  brass: "#A68B5B",
  brassLight: "#C4A96E",
  black: "#0A0A0A",
  muted: "#8A8478",
  loss: "#8B2020",
  warn: "#7A4F1A",
};

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cs: colors,
      },
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      letterSpacing: {
        wider2: "0.18em",
        widest2: "0.32em",
      },
      maxWidth: {
        viewport: "430px",
      },
    },
  },
  plugins: [],
};

export default config;
