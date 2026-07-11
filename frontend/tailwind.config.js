/** @type {import('tailwindcss').Config} */
// Tailwind 3.4.x, pinned (docs/frontend/decisions.md D-F15). Pure mapping
// layer per docs/frontend/m12b-contract.md §1 — every value here references
// a CSS custom property from src/styles/tokens.css; nothing is restated.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // App-facing semantic tokens (m12b-contract.md §1 named-utilities list).
        // Each resolves through the "-current" family, so the same class
        // renders correctly whether or not an `.inset` ancestor is present.
        bg: "hsl(var(--bg-current) / <alpha-value>)",
        surface: "hsl(var(--surface-current) / <alpha-value>)",
        border: {
          DEFAULT: "hsl(var(--border-current) / <alpha-value>)",
          strong: "hsl(var(--border-strong) / <alpha-value>)",
        },
        text: {
          DEFAULT: "hsl(var(--text-current) / <alpha-value>)",
          2: "hsl(var(--text-2-current) / <alpha-value>)",
        },
        action: {
          DEFAULT: "hsl(var(--action) / <alpha-value>)",
          hover: "hsl(var(--action-hover) / <alpha-value>)",
        },
        inset: {
          DEFAULT: "hsl(var(--inset) / <alpha-value>)",
          surface: "hsl(var(--inset-surface) / <alpha-value>)",
          border: "hsl(var(--inset-border) / <alpha-value>)",
          text: {
            DEFAULT: "hsl(var(--inset-text) / <alpha-value>)",
            2: "hsl(var(--inset-text-2) / <alpha-value>)",
          },
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          ink: "hsl(var(--accent-ink) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          soft: "hsl(var(--success-soft) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          soft: "hsl(var(--warning-soft) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "hsl(var(--danger) / <alpha-value>)",
          soft: "hsl(var(--danger-soft) / <alpha-value>)",
        },
        seam: {
          DEFAULT: "hsl(var(--seam-current) / <alpha-value>)",
          // explicit non-flipping overrides for the Seam `variant` prop
          light: "hsl(var(--seam) / <alpha-value>)",
          inset: "hsl(var(--seam-inset) / <alpha-value>)",
        },
        ring: "hsl(var(--ring-current) / <alpha-value>)",

        // shadcn bridge (m12b-contract.md §7) — consumed only by
        // components/ui/*; assigned from ours in tokens.css Region 3.
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        input: "hsl(var(--input) / <alpha-value>)",
        // shadcn's internal hover/selected chrome (Select/Command/Button) —
        // deliberately not "accent" (that name is reserved for our
        // sanctioned lime token above; see tokens.css Region 3 for why).
        chrome: {
          DEFAULT: "hsl(var(--chrome) / <alpha-value>)",
          foreground: "hsl(var(--chrome-foreground) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        12: "var(--space-12)",
        "title-bottom": "var(--space-title-bottom)",
      },
      maxWidth: {
        content: "var(--content-max-width)",
        // DetailPanel Sheet width (component-library.md §4, decisions.md D-F40).
        detail: "var(--detail-panel-width)",
        // Ask thread reading measure (design-system.md §6, decisions.md M12g).
        thread: "var(--ask-thread-max-width)",
      },
      width: {
        // Shell-structural widths (m12c-contract.md §2, decisions.md D-F28).
        sidebar: "var(--sidebar-width)",
        rail: "var(--rail-width)",
        // Search filter rail (design-system.md §6, decisions.md D-F45).
        "filter-rail": "var(--filter-rail-width)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        md: "var(--radius)",
        lg: "var(--radius-lg)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        float: "var(--shadow-float)",
      },
      transitionDuration: {
        fast: "var(--dur-fast)",
        base: "var(--dur-base)",
        slow: "var(--dur-slow)",
        zoom: "var(--dur-zoom)",
      },
      transitionTimingFunction: {
        "out-app": "var(--ease-out-app)",
        press: "var(--ease-press)",
      },
      zIndex: {
        shell: "var(--z-shell)",
        panel: "var(--z-panel)",
        palette: "var(--z-palette)",
        toast: "var(--z-toast)",
      },
      keyframes: {
        "fade-rise": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "caret-blink": {
          "0%, 49%": { opacity: 1 },
          "50%, 100%": { opacity: 0 },
        },
        "dot-pulse": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.5 },
        },
      },
      animation: {
        "fade-rise": "fade-rise var(--dur-slow) var(--ease-out-app) both",
        "caret-blink": "caret-blink 1s steps(1) infinite",
        "dot-pulse": "dot-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
