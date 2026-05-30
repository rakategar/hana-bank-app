import { lastNDates, scoreColor, initials } from '../lib/utils';

// rows: [{ user, scoresByDate: Map<date, avg> }]
export default function TeamHeatmap({ rows = [], days = 10 }) {
  const dates = lastNDates(days);
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="min-w-max">
        <div className="flex gap-1 mb-1 pl-24">
          {dates.map((d) => (
            <div key={d} className="w-6 text-center text-[9px] text-text-muted">{Number(d.slice(-2))}</div>
          ))}
        </div>
        {rows.map(({ user, scoresByDate }) => (
          <div key={user.id} className="flex items-center gap-1 mb-1">
            <div className="w-24 flex items-center gap-1.5 pr-2 shrink-0">
              <span className="h-5 w-5 rounded-full bg-elevated grid place-items-center text-[8px] font-bold shrink-0">
                {initials(user.name)}
              </span>
              <span className="text-[10px] text-text-secondary truncate">{user.name.split(' ')[0]}</span>
            </div>
            {dates.map((d) => {
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
    </div>
  );
}
