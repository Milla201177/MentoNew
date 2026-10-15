/**
 * PostCSS configuration for Tailwind CSS v4.
 *
 * The `@tailwindcss/postcss` plugin only emits Tailwind output (preflight,
 * utilities, theme) into stylesheets that contain `@import "tailwindcss"`.
 * Tailwind is imported solely from `src/app/(frontend)/globals.css`, so the
 * Payload admin (`(payload)` route group), which uses its own SCSS pipeline
 * and never imports Tailwind, is left untouched by Tailwind's base reset.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
