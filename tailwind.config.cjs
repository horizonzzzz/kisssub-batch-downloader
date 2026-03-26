/** @type {import("tailwindcss").Config} */
module.exports = {
  content: [
    "./options.tsx",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "oklch(var(--color-ink-950) / <alpha-value>)",
          900: "oklch(var(--color-ink-900) / <alpha-value>)",
          800: "oklch(var(--color-ink-800) / <alpha-value>)",
          700: "oklch(var(--color-ink-700) / <alpha-value>)",
          600: "oklch(var(--color-ink-600) / <alpha-value>)",
          500: "oklch(var(--color-ink-500) / <alpha-value>)",
          400: "oklch(var(--color-ink-400) / <alpha-value>)"
        },
        paper: {
          50: "oklch(var(--color-paper-50) / <alpha-value>)",
          100: "oklch(var(--color-paper-100) / <alpha-value>)",
          200: "oklch(var(--color-paper-200) / <alpha-value>)",
          300: "oklch(var(--color-paper-300) / <alpha-value>)"
        },
        azure: {
          400: "oklch(var(--color-azure-400) / <alpha-value>)",
          500: "oklch(var(--color-azure-500) / <alpha-value>)",
          600: "oklch(var(--color-azure-600) / <alpha-value>)",
          700: "oklch(var(--color-azure-700) / <alpha-value>)"
        },
        mint: {
          500: "oklch(var(--color-mint-500) / <alpha-value>)",
          600: "oklch(var(--color-mint-600) / <alpha-value>)"
        },
        amber: {
          500: "oklch(var(--color-amber-500) / <alpha-value>)",
          600: "oklch(var(--color-amber-600) / <alpha-value>)"
        },
        crimson: {
          500: "oklch(var(--color-crimson-500) / <alpha-value>)",
          600: "oklch(var(--color-crimson-600) / <alpha-value>)"
        }
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
        float: "var(--shadow-float)"
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"]
      },
      spacing: {
        13: "3.25rem"
      }
    }
  }
}
