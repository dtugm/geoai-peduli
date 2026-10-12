import { heroui } from "@heroui/theme";
import { lightModeHguColor } from "./styles/color";

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "field-work": "#7E57C2", // A nice purple
        "sick-leave": "#EF5350", // A soft red
        "wfh-orange": "#FFA726", // A vibrant orange
        ...lightModeHguColor,
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            brand: {
              DEFAULT: "linear-gradient(90deg, #7C3AED, #A855F7)",
              foreground: "#ffffff",
            },
          },
        },
        dark: {
          colors: {},
        },
      },
    }),
  ],
};

module.exports = config;
