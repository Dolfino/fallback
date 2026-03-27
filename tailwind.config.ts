import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shell: "#0f1b22",
        ink: "#0f1720",
        fog: "#e8ede7",
        canvas: "#eff3ee",
        panel: "#f8fbf7",
        accent: {
          DEFAULT: "#2f6f63",
          soft: "#d8ebe6",
          ink: "#163f38",
        },
        warn: {
          DEFAULT: "#c27d33",
          soft: "#f7ead6",
          ink: "#7b4d16",
        },
        danger: {
          DEFAULT: "#b44943",
          soft: "#f7dfdd",
          ink: "#6f2723",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Aptos", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        panel: "0 10px 30px rgba(15, 27, 34, 0.08)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
