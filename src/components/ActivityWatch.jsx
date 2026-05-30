import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { fetchActivityRange } from '../lib/db';
import { formatDateISO, formatDateID, completionColor, nowDate } from '../lib/utils';

const WEEKS = 13;
const DAY_LABELS = ['Sen', '', 'Rab', '', 'Jum', '', ''];
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Bangun grid kolom-minggu (mulai Senin) selama WEEKS minggu sampai hari ini
function buildGrid(end) {
  const today = new Date(end);
  today.setHours(0, 0, 0, 0);
  // mundur ke Senin minggu ini
  const dow = (today.getDay() + 6) % 7; // 0 = Senin
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - dow);
  const start = new Date(lastMonday);
  start.setDate(lastMonday.getDate() - (WEEKS - 1) * 7);

  const columns = [];
  for (let w = 0; w < WEEKS; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(start);
      cell.setDate(start.getDate() + w * 7 + d);
      col.push(cell);
    }
    columns.push(col);
  }
  return { columns, start };
}

export default function ActivityWatch({ userId, end = nowDate(), title = 'Activity Watch' }) {
  const [ratios, setRatios] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const { columns } = buildGrid(end);
  const today = formatDateISO(end);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const all = columns.flat().map((d) => formatDateISO(d));
        const rows = await fetchActivityRange(userId, all);
        if (alive) setRatios(new Map(rows.map((r) => [r.date, r.ratio])));
      } catch {
        /* abaikan */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, today]);

  // label bulan per kolom (saat bulan berganti)
  const monthLabels = columns.map((col, i) => {
    const first = col[0];
    if (i === 0) return MONTHS_ID[first.getMonth()];
    const prev = columns[i - 1][0];
    return first.getMonth() !== prev.getMonth() ? MONTHS_ID[first.getMonth()] : '';
  });

  const activeDays = [...ratios.values()].filter((r) => r > 0).length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <Activity size={18} className="text-hana-teal-700" /> {title}
        </h2>
        <span className="text-xs text-text-muted">{activeDays} hari aktif</span>
      </div>

      {loading ? (
        <div className="skeleton h-28" />
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-1 min-w-max">
            {/* bulan */}
            <div className="flex gap-1 pl-8">
              {monthLabels.map((m, i) => (
                <div key={i} className="w-3.5 text-[9px] text-text-muted">{m}</div>
              ))}
            </div>
            <div className="flex gap-1">
              {/* hari */}
              <div className="flex flex-col gap-1 pr-1 w-7">
                {DAY_LABELS.map((d, i) => (
                  <div key={i} className="h-3.5 text-[9px] text-text-muted leading-[14px]">{d}</div>
                ))}
              </div>
              {/* kolom minggu */}
              {columns.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-1">
                  {col.map((cell) => {
                    const iso = formatDateISO(cell);
                    const future = iso > today;
                    const ratio = ratios.get(iso);
                    const color = !future ? completionColor(ratio) : null;
                    return (
                      <div
                        key={iso}
                        title={future ? '' : `${formatDateID(iso)} — ${ratio ? Math.round(ratio * 100) + '% terisi' : 'tidak ada aktivitas'}`}
                        className="h-3.5 w-3.5 rounded-[3px] border"
                        style={{
                          backgroundColor: future ? 'transparent' : (color || '#EEF2F7'),
                          borderColor: future ? 'transparent' : (color || '#E2E8F0'),
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mt-3 text-[10px] text-text-muted">
        <span>Sedikit</span>
        <span className="flex gap-1">
          {['#EEF2F7', '#CDF0E9', '#7FD9C6', '#2FBFA3', '#04B292'].map((c) => (
            <span key={c} className="h-3 w-3 rounded-[3px] border border-hana-border" style={{ backgroundColor: c }} />
          ))}
        </span>
        <span>Banyak</span>
      </div>
    </div>
  );
}
