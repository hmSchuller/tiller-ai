/**
 * Centralised design tokens for the Tiller dashboard.
 * At runtime, `applyTheme()` injects these as CSS custom properties on `:root`
 * so that styles.css can consume them via `var(--...)`.
 */

export const THEME: Record<string, string> = {
  // Backgrounds
  '--color-bg': '#0f172a',
  '--color-bg-gradient': 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
  '--color-surface': 'rgba(15, 23, 42, 0.84)',
  '--color-surface-inset': 'rgba(30, 41, 59, 0.65)',

  // Borders
  '--color-border': 'rgba(148, 163, 184, 0.25)',
  '--color-border-input': 'rgba(148, 163, 184, 0.35)',

  // Text
  '--color-text': '#e2e8f0',
  '--color-text-muted': '#cbd5e1',
  '--color-text-subtle': '#94a3b8',

  // Accent
  '--color-accent': '#38bdf8',
  '--color-accent-gradient': 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',

  // Status — info
  '--color-info-bg': 'rgba(59, 130, 246, 0.14)',
  '--color-info-border': 'rgba(96, 165, 250, 0.40)',
  '--color-info-text': '#93c5fd',

  // Status — success
  '--color-success-bg': 'rgba(34, 197, 94, 0.14)',
  '--color-success-border': 'rgba(74, 222, 128, 0.45)',
  '--color-success-text': '#86efac',

  // Status — warn
  '--color-warn-bg': 'rgba(234, 179, 8, 0.14)',
  '--color-warn-border': 'rgba(250, 204, 21, 0.45)',
  '--color-warn-text': '#fde047',

  // Status — error
  '--color-error-bg': 'rgba(239, 68, 68, 0.14)',
  '--color-error-border': 'rgba(248, 113, 113, 0.50)',
  '--color-error-text': '#fca5a5',

  // Spacing scale
  '--space-1': '4px',
  '--space-2': '8px',
  '--space-3': '12px',
  '--space-4': '16px',
  '--space-5': '20px',
  '--space-6': '24px',
  '--space-8': '32px',
  '--space-12': '48px',

  // Border radii
  '--radius-sm': '10px',
  '--radius-md': '14px',
  '--radius-lg': '18px',

  // Shadows
  '--shadow-card': '0 16px 40px rgba(15, 23, 42, 0.28)',
  '--shadow-hero': '0 4px 24px rgba(14, 165, 233, 0.15)',

  // Typography
  '--font-family':
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

/** Returns the full `:root { ... }` CSS variable block as a string. */
export function buildCssVarBlock(): string {
  const vars = Object.entries(THEME)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  return `:root {\n${vars}\n}`;
}

/** Injects the theme as CSS custom properties on the document root. */
export function applyTheme(): void {
  const style = document.createElement('style');
  style.textContent = buildCssVarBlock();
  document.head.prepend(style);
}
