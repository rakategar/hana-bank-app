import { lastNDates, initials, levelInfo } from '../lib/utils';

const HORIZON_COLORS = {
  1: '#EE5D50', // Critical (Merah)
  2: '#FFB547', // Recovery (Oranye/Amber)
  3: '#3B82F6', // On Track (Biru)
  4: '#05CD99', // High Impact (Hijau Emerald)
};

const NO_DATA_COLOR = '#E9EDF7'; // Abu-abu halus khas Horizon UI

// rows: [{ user, scoresByDate: Map<date, avg> }]
export default function TeamHeatmap({ rows = [], days = 10, onCellClick }) {
  const dates = lastNDates(days);

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="min-w-max pb-2">
        {/* Date Headers */}
        <div className="flex gap-1 mb-2 pl-24">
          {dates.map((d) => (
            <div key={d} className="w-6 text-center text-[10px] font-bold text-text-muted">
              {Number(d.slice(-2))}
            </div>
          ))}
        </div>

        {/* User Rows */}
        {rows.map(({ user, scoresByDate }) => (
          <div key={user.id} className="flex items-center gap-1 mb-1.5">
            {/* User Row Label */}
            <div className="w-24 flex items-center gap-1.5 pr-2 shrink-0">
              <span className="h-5 w-5 rounded-full bg-elevated grid place-items-center text-[8px] font-bold text-text-secondary shrink-0 border border-hana-border/30">
                {initials(user.name)}
              </span>
              <span className="text-[10px] font-semibold text-text-secondary truncate" title={user.name}>
                {user.name.split(' ')[0]}
              </span>
            </div>

            {/* Heatmap Cells */}
            {dates.map((d) => {
              const avg = scoresByDate.get(d);
              const has = avg != null;
              
              // Resolve color based on score level
              let color = NO_DATA_COLOR;
              let labelText = 'Belum ada data';
              if (has) {
                const lvl = levelInfo(Math.round(avg));
                color = HORIZON_COLORS[lvl?.key === 'CRITICAL' ? 1 : lvl?.key === 'RECOVERY' ? 2 : lvl?.key === 'ON TRACK' ? 3 : 4] || '#52616B';
                labelText = `Skor: ${Number(avg).toFixed(1)} (${lvl?.label})`;
              }

              return (
                <div
                  key={d}
                  title={`${user.name} · ${d} · ${labelText}`}
                  onClick={() => onCellClick && onCellClick(user, d)}
                  className="w-6 h-6 rounded-[6px] transition-all duration-150 hover:scale-115 hover:shadow-md cursor-pointer hover:z-10"
                  style={{
                    backgroundColor: color,
                  }}
                />
              );
            })}
          </div>
        ))}

        {/* Heatmap Legend */}
        <div className="mt-4 flex items-center justify-end gap-3 text-[10px] font-semibold text-text-muted pr-1">
          <span>Skor:</span>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: HORIZON_COLORS[1] }} />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: HORIZON_COLORS[2] }} />
            <span>Recovery</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: HORIZON_COLORS[3] }} />
            <span>On Track</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: HORIZON_COLORS[4] }} />
            <span>High Impact</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: NO_DATA_COLOR }} />
            <span>Belum Ada Data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
