import { lastNDates, scoreColor, formatDateID } from '../lib/utils';

// data: array of { date, daily_average } — heatmap 10 hari ICU
export default function Heatmap({ data = [], days = 10, label = 'Heatmap 10 Hari ICU' }) {
  const dates = lastNDates(days);
  const byDate = new Map(data.map((d) => [d.date, d.daily_average]));

  return (
    <div>
      {label && <div className="text-xs font-medium text-text-secondary mb-2">{label}</div>}
      <div className="flex gap-1.5 flex-wrap">
        {dates.map((date) => {
          const avg = byDate.get(date);
          const has = avg != null;
          const color = has ? scoreColor(Math.round(avg)) : 'transparent';
          const dayNum = Number(date.slice(-2));
          return (
            <div
              key={date}
              title={`${formatDateID(date)}${has ? ` — skor ${avg}` : ' — belum ada data'}`}
              className="h-9 w-9 rounded-md grid place-items-center text-[10px] font-semibold border"
              style={{
                backgroundColor: has ? `${color}33` : '#2E405733',
                borderColor: has ? color : '#374B5C',
                color: has ? color : '#52616B',
              }}
            >
              {dayNum}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-text-muted">
        {[
          ['CRITICAL', '#EF4444'],
          ['RECOVERY', '#F97316'],
          ['ON TRACK', '#3B82F6'],
          ['HIGH IMPACT', '#22C55E'],
        ].map(([l, c]) => (
          <span key={l} className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
