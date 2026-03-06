import type { DashboardStatus, Tone } from '../view-model.js';

export type StatusBannerProps = {
  status: DashboardStatus | null;
};

const TONE_ICONS: Record<Tone, string> = {
  info: 'ℹ',
  success: '✓',
  warn: '⚠',
  error: '✕',
};

function getLiveRegionProps(tone: Tone) {
  return tone === 'warn' || tone === 'error'
    ? { role: 'alert' as const, 'aria-live': 'assertive' as const }
    : { role: 'status' as const, 'aria-live': 'polite' as const };
}

export function StatusBanner({ status }: StatusBannerProps) {
  if (!status) {
    return <div id="status" className="status-banner hidden" aria-hidden="true" />;
  }

  const liveRegionProps = getLiveRegionProps(status.tone);

  return (
    <div id="status" className={`status-banner ${status.tone}`} aria-atomic="true" {...liveRegionProps}>
      <em className="status-icon" aria-hidden="true">{TONE_ICONS[status.tone]}</em>
      <span>{status.message}</span>
    </div>
  );
}
