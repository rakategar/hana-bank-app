import { scoreColor, initials } from '../lib/utils';

// rows: [{ user, scoresByDate: Map<date, avg> }]
// weeks: [['2026-06-08',...,'2026-06-12'], ['2026-06-15',...,'2026-06-19']]
export default function TeamHeatmap({ rows = [], weeks = [] }) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="min-w-max">
        {/* Header tanggal — 2 grup dengan gap antar minggu */}
        <div className="flex items-center mb-1 pl-24">
          {weeks.map((week, wi) => (
            <div key={wi} className={`flex gap-1 ${wi > 0 ? 'ml-4' : ''}`}>
              {week.map((d) => (
                <div key={d} className="w-6 text-center text-[9px] text-text-muted">
                  {Number(d.slice(-2))}
                </div>
              ))}
            </div>
          ))}
        </div>

        {rows.map(({ user, scoresByDate }) => (
          <div key={user.id} className="flex items-center mb-1">
            <div className="w-24 flex items-center gap-1.5 pr-2 shrink-0">
              <span className="h-5 w-5 rounded-full bg-elevated grid place-items-center text-[8px] font-bold shrink-0">
                {initials(user.name)}
              </span>
              <span className="text-[10px] text-text-secondary truncate">{user.name.split(' ')[0]}</span>
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className={`flex gap-1 ${wi > 0 ? 'ml-4' : ''}`}>
                {week.map((d) => {
                  const avg = scoresByDate.get(d);
                  const has = avg != null;
                  const c = has ? scoreColor(Math.round(avg)) : null;
                  return (
                    <div
                      key={d}
                      title={has ? `${user.name} · ${d} · ${avg}` : `${d} · belum ada data`}
                      className="w-6 h-6 rounded border"
                      style={{
                        backgroundColor: has ? `${c}33` : '#2E405733',
                        borderColor: has ? c : '#374B5C',
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
