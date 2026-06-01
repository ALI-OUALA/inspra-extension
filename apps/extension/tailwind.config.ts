import type { Config } from "tailwindcss";

export default {
  content: ["./entrypoints/**/*.{html,ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101314",
        teal: "#0C4D5A",
        mist: "#DDE4E2",
        cyan: "#5EEAD4",
        violet: "#8B7CF6",
        gold: "#D6B36A"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
} satisfies Config;
