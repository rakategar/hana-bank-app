import { lastNDates, completionColor, formatDateID } from '../lib/utils';

// data: array of { date, ratio } — heatmap penyelesaian aktivitas (bukan skor)
export default function CompletionHeatmap({ data = [], days = 10, label = 'Penyelesaian Aktivitas — 10 Hari' }) {
  const dates = lastNDates(days);
  const byDate = new Map(data.map((d) => [d.date, d.ratio]));

  return (
    <div>
      {label && <div className="text-xs font-medium text-text-secondary mb-2">{label}</div>}
      <div className="flex gap-1.5 flex-wrap">
        {dates.map((date) => {
          const ratio = byDate.get(date);
          const color = completionColor(ratio);
          const dayNum = Number(date.slice(-2));
          return (
            <div
              key={date}
              title={`${formatDateID(date)}${ratio != null ? ` — ${Math.round(ratio * 100)}% terisi` : ' — belum ada data'}`}
              className="h-9 w-9 rounded-md grid place-items-center text-[10px] font-semibold border"
              style={{
                backgroundColor: color || '#F1F5F9',
                borderColor: color || '#E2E8F0',
                color: color ? '#0F2A24' : '#94A3B8',
              }}
            >
              {dayNum}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-text-muted">
        <span>Kurang</span>
        <span className="flex gap-1">
          {['#CDF0E9', '#7FD9C6', '#2FBFA3', '#04B292'].map((c) => (
            <span key={c} className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: c }} />
          ))}
        </span>
        <span>Lengkap</span>
      </div>
    </div>
  );
}
