import preset from './tailwind.preset.js'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // The design system's base.css handles resets; Tailwind is used for layout utilities only.
  corePlugins: { ...preset.corePlugins, preflight: false },
}
