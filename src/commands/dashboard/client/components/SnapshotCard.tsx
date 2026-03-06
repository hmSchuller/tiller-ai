import type { PanelRow } from '../view-model.js';

export type SnapshotCardProps = {
  title: string;
  items: PanelRow[];
};

export function SnapshotCard({ title, items }: SnapshotCardProps) {
  return (
    <article className="snapshot-card card">
      <h3 className="card-title">{title}</h3>
      {items.length === 0 ? (
        <p className="snapshot-empty">No data available</p>
      ) : (
        <dl className="snapshot-rows">
          {items.map((row) => (
            <div key={`${title}-${row.label}`} className="snapshot-row">
              <dt className="snapshot-label">{row.label}</dt>
              <dd className="snapshot-value">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}
