import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./modules/**/*.{ts,tsx}", "./kernel/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        "ink-muted": "var(--color-ink-muted)",
        "ink-faint": "var(--color-ink-faint)",
        paper: "var(--color-paper)",
        surface: "var(--color-surface)",
        "surface-sunken": "var(--color-surface-sunken)",
        "surface-selected": "var(--color-surface-selected)",
        "surface-attention": "var(--color-surface-attention)",
        "surface-unread": "var(--color-surface-unread)",
        accent: "var(--color-accent)",
        "accent-hover": "var(--color-accent-hover)",
        "accent-active": "var(--color-accent-active)",
        "on-accent": "var(--color-on-accent)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        danger: "var(--color-danger)",
        "danger-surface": "var(--color-danger-surface)",
        "on-danger": "var(--color-on-danger)",
        warning: "var(--color-warning)",
        "warning-surface": "var(--color-warning-surface)",
        success: "var(--color-success)",
        "success-surface": "var(--color-success-surface)",
        "disabled-ink": "var(--color-disabled-ink)",
        "disabled-surface": "var(--color-disabled-surface)",
        scrim: "var(--color-scrim)",
      },
      spacing: {
        0: "var(--space-0)",
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        10: "var(--space-10)",
        12: "var(--space-12)",
        16: "var(--space-16)",
      },
      borderRadius: {
        none: "var(--radius-none)",
        DEFAULT: "var(--radius)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Segoe UI", "sans-serif"],
        serif: ["var(--font-serif)", "Iowan Old Style", "Palatino Linotype", "Palatino", "serif"],
      },
      fontSize: {
        caption: ["var(--text-caption-size)", { lineHeight: "var(--text-caption-line)" }],
        body: ["var(--text-body-size)", { lineHeight: "var(--text-body-line)" }],
        "body-dense": ["var(--text-body-dense-size)", { lineHeight: "var(--text-body-dense-line)" }],
        label: ["var(--text-label-size)", { lineHeight: "var(--text-label-line)" }],
        button: ["var(--text-button-size)", { lineHeight: "var(--text-button-line)" }],
        section: ["var(--text-section-size)", { lineHeight: "var(--text-section-line)" }],
        page: ["var(--text-page-size)", { lineHeight: "var(--text-page-line)" }],
        wordmark: ["var(--text-wordmark-size)", { lineHeight: "var(--text-wordmark-line)" }],
      },
      zIndex: {
        base: "var(--z-base)",
        sticky: "var(--z-sticky)",
        nav: "var(--z-nav)",
        banner: "var(--z-banner)",
        dropdown: "var(--z-dropdown)",
        overlay: "var(--z-overlay)",
        dialog: "var(--z-dialog)",
        toast: "var(--z-toast)",
        skip: "var(--z-skip)",
      },
      transitionDuration: {
        instant: "var(--duration-instant)",
        color: "var(--duration-color)",
        panel: "var(--duration-panel)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
      },
      minHeight: {
        target: "var(--target-min)",
      },
      screens: {
        desktop: "960px",
        wide: "1280px",
      },
    },
  },
  corePlugins: {
    boxShadow: false,
  },
  plugins: [],
};

export default config;
