import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f6f7ef",
          100: "#ebeddc",
          200: "#d4d9b3",
          300: "#bac282",
          400: "#9ca55d",
          500: "#7a8340",
          600: "#606834",
          700: "#494f2a",
          800: "#363b20",
          900: "#252816",
        },
        sand: {
          50: "#fcf8f2",
          100: "#f6efe3",
          200: "#eddcc3",
          300: "#e0c39c",
          400: "#d2a773",
          500: "#c58c55",
          600: "#aa6f42",
          700: "#875437",
          800: "#6d4430",
          900: "#593929",
        },
        ink: "#152013",
      },
      boxShadow: {
        panel: "0 18px 50px rgba(19, 29, 14, 0.10)",
        highlight: "0 0 0 1px rgba(122, 131, 64, 0.16), 0 20px 50px rgba(21, 32, 19, 0.08)",
      },
      backgroundImage: {
        "hero-grid":
          "linear-gradient(rgba(21, 32, 19, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(21, 32, 19, 0.05) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
