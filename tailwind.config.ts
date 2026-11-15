import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Primary: chap.co.ke logo blue (sampled #0043D2) */
        brand: {
          50: "#EEF3FF",
          100: "#D9E6FF",
          200: "#B3CCFF",
          300: "#84ABFF",
          400: "#5583FB",
          500: "#2F5EF1",
          600: "#0043D2",
          700: "#0033A6",
          800: "#00287F",
          900: "#16245C",
          950: "#0B1437",
        },
        /* Accent: chap.co.ke logo red (sampled #FE1123) — used sparingly */
        accent: {
          50: "#FEF1F2",
          100: "#FDE3E6",
          200: "#FBCFD4",
          300: "#F7A8B1",
          400: "#F45563",
          500: "#F81124",
          600: "#D30D1F",
          700: "#B00C1C",
          800: "#920E1C",
          900: "#7A111D",
        },
        /* Solid neutrals: flat light grey surfaces (no warm beige tint). */
        sand: {
          50: "#F4F4F5",
          100: "#EDEDEF",
          200: "#D9D9DE",
        },
        ink: {
          900: "#101812",
          700: "#2a3530",
          500: "#5b6a63",
          400: "#7d8c86",
        },
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "Arial", "Helvetica", "sans-serif"],
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "4px",
        md: "4px",
        lg: "4px",
        xl: "4px",
        "2xl": "6px",
        card: "4px",
      },
      boxShadow: {
        card: "0 1px 0 rgba(17,20,24,.06)",
      },
    },
  },
  plugins: [],
};
export default config;
