/** Rabies Response — Tailwind preset (Tailwind 3.x). Colours resolve to the CSS variables in /styles.css,
 *  so light/dark switch by setting data-theme="dark" on <html>. Usage: presets: [require('./tailwind.preset.js')]
 */
const v = (n) => `var(--color-${n})`;
const names = ["background","surface","surface-alt","border","border-strong","text-primary","text-secondary","text-disabled","primary","primary-hover","primary-pressed","on-primary","primary-container","on-primary-container","secondary","secondary-container","on-secondary-container","emergency","emergency-hover","on-emergency","emergency-container","on-emergency-container","danger","danger-container","on-danger-container","warning","warning-container","on-warning-container","orange","orange-container","on-orange-container","success","success-container","on-success-container","info","info-container","on-info-container","neutral","neutral-container","on-neutral-container","focus","inverse-surface","on-inverse"];
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: Object.fromEntries(names.map((n) => [n, v(n)])),
      // e.g. bg-primary, text-on-primary, bg-danger-container, text-text-secondary, border-border-strong
      fontFamily: { sans: ['var(--font-sans)'], mono: ['var(--font-mono)'] },
      fontWeight: { normal: '400', semibold: '600' },
      fontSize: {
        caption: ['var(--text-caption-size)', 'var(--text-caption-lh)'],
        body: ['var(--text-body-size)', 'var(--text-body-lh)'],
        'body-lg': ['var(--text-body-lg-size)', 'var(--text-body-lg-lh)'],
        label: ['var(--text-label-size)', { lineHeight: 'var(--text-label-lh)', fontWeight: '600' }],
        'title-sm': ['var(--text-title-sm-size)', { lineHeight: 'var(--text-title-sm-lh)', fontWeight: '600' }],
        title: ['var(--text-title-size)', { lineHeight: 'var(--text-title-lh)', fontWeight: '600' }],
        'title-lg': ['var(--text-title-lg-size)', { lineHeight: 'var(--text-title-lg-lh)', fontWeight: '600' }],
        display: ['var(--text-display-size)', { lineHeight: 'var(--text-display-lh)', fontWeight: '600' }],
        stat: ['var(--text-stat-size)', { lineHeight: 'var(--text-stat-lh)', fontWeight: '600' }],
      },
      // 4px base. Tailwind's default numeric scale is already 4px-based; these add semantic aliases.
      spacing: { 'touch': '48px', 'control': 'var(--control-h)', 'control-lg': 'var(--control-h-lg)', 'panel': 'var(--panel-w)', 'sidebar': 'var(--sidebar-w)' },
      borderRadius: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', pill: '999px' },
      borderWidth: { DEFAULT: '1px', 2: '2px', 3: '3px' },
      boxShadow: { 1: 'var(--shadow-1)', none: 'none' },
      ringWidth: { DEFAULT: '3px' },
      ringColor: { DEFAULT: v('focus') },
      ringOffsetWidth: { DEFAULT: '2px' },
      transitionDuration: { fast: '120ms', base: '150ms', DEFAULT: '120ms' },
      transitionTimingFunction: { standard: 'cubic-bezier(0.2, 0, 0, 1)', DEFAULT: 'cubic-bezier(0.2, 0, 0, 1)' },
      minHeight: { touch: '48px', control: 'var(--control-h)' },
      minWidth: { touch: '48px' },
      screens: { xs: '320px', sm: '360px', md: '768px', lg: '1024px', xl: '1366px' },
    },
  },
  // Performance guard: disable utilities that break the "flat" rule.
  corePlugins: { backdropBlur: false, backdropFilter: false, blur: false, dropShadow: false, backgroundImage: false, gradientColorStops: false },
};
