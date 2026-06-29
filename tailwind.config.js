/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#F8F5F0",
        cocoa: "#2B1D18",
        saffron: "#C97A2B",
        brand: {
          primary: "#ED3C18",
          secondary: "#FA9040",
        },
        admin: {
          primary: "#D91F11",
          orange: "#ED3C18",
          gold: "#FA9040",
          ivory: "#FFF8F2",
          text: "#1B1B1B",
          success: "#16A34A",
          warning: "#F59E0B",
          danger: "#DC2626",
          muted: "#6B7280",
          border: "#E8E0D8",
          surface: "#FFFFFF",
          "surface-dark": "#1A1A1A",
          "border-dark": "#2E2E2E",
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', "Georgia", "serif"],
        sans: ['"Inter"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      letterSpacing: {
        label: "0.28em",
      },
      transitionTimingFunction: {
        // GSAP power3.out approximation
        power3: "cubic-bezier(0.215, 0.61, 0.355, 1)",
        luxury: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        400: "400ms",
        600: "600ms",
      },
      boxShadow: {
        premium: "0 30px 60px -25px rgba(43, 29, 24, 0.35)",
        card: "0 8px 32px -12px rgba(43, 29, 24, 0.15)",
        "card-hover": "0 20px 48px -16px rgba(43, 29, 24, 0.22)",
        admin: "0 4px 24px -4px rgba(27, 27, 27, 0.08)",
        "admin-lg": "0 12px 40px -8px rgba(27, 27, 27, 0.12)",
        glass: "0 8px 32px rgba(27, 27, 27, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
      },
      maxWidth: {
        content: "1400px",
      },
    },
  },
  plugins: [],
};
