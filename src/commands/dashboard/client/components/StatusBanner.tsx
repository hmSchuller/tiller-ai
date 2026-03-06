import type { Tone } from '../view-model.js';

export type StatusBannerProps = {
  status: { message: string; tone: Tone } | null;
};

const TONE_ICONS: Record<Tone, string> = {
  info: 'ℹ',
  success: '✓',
  warn: '⚠',
  error: '✕',
};

export function StatusBanner({ status }: StatusBannerProps) {
  if (!status) {
    return <div id="status" className="status-banner hidden" role="status" aria-live="polite" />;
  }

  return (
    <div id="status" className={`status-banner ${status.tone}`} role="status" aria-live="polite">
      <em className="status-icon" aria-hidden="true">{TONE_ICONS[status.tone]}</em>
      <span>{status.message}</span>
    </div>
  );
}
