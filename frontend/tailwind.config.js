/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC", // Light mode background (slate-50)
        foreground: "#0F172A", // Dark text (slate-900)
        neonCyan: "#0EA5E9", // Bright blue for light mode
        deepBlue: "#2563EB", // Standard blue
        electricPurple: "#8B5CF6", // Purple accent
        neonGreen: "#10B981", // Emerald green
        neonOrange: "#F97316", // Orange accent
      },
      fontFamily: {
        outfit: ["Outfit", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      backgroundImage: {
        'light-grid': "radial-gradient(circle, #E2E8F0 1px, transparent 1px)", // Subtle light grid
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(14, 165, 233, 0.5), 0 0 20px rgba(14, 165, 233, 0.3)',
        'neon-blue': '0 0 10px rgba(37, 99, 235, 0.5), 0 0 20px rgba(37, 99, 235, 0.3)',
        'neon-emerald': '0 0 10px rgba(16, 185, 129, 0.5), 0 0 20px rgba(16, 185, 129, 0.3)',
        'neon-orange': '0 0 10px rgba(249, 115, 22, 0.5), 0 0 20px rgba(249, 115, 22, 0.3)',
      },
      dropShadow: {
        'neon-cyan': ['0 0 5px rgba(14, 165, 233, 0.8)', '0 0 10px rgba(14, 165, 233, 0.5)'],
        'neon-blue': ['0 0 5px rgba(37, 99, 235, 0.8)', '0 0 10px rgba(37, 99, 235, 0.5)'],
      }
    },
  },
  plugins: [],
}
