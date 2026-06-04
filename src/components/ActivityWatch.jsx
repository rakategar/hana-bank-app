import { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchActivitiesForDates } from '../lib/db';
import { slotsForRole } from '../constants/timeSlots';
import { formatDateISO, nowDate, clsx } from '../lib/utils';

const DAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const STATUS_COLOR = { done: '#22C55E', partial: '#F97316', not_done: '#EF4444' };
const STATUS_LABEL = { done: 'Selesai', partial: 'Sebagian', not_done: 'Terlewat' };
const EMPTY = '#EEF2F7';

// Senin pada minggu yang memuat `date`
function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d;
}

export default function ActivityWatch({ userId, role = 'FA', title = 'Activity Watch' }) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(nowDate()));
  const [statusMap, setStatusMap] = useState(new Map()); // date → Map(time → status)
  const [loading, setLoading] = useState(true);

  const slots = slotsForRole(role);
  const today = formatDateISO(nowDate());

  // Senin–Jumat minggu terpilih
  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const isoDates = weekDays.map((d) => formatDateISO(d));

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchActivitiesForDates(userId, isoDates);
        if (!alive) return;
        const map = new Map();
        rows.forEach((row) => {
          const m = new Map();
          row.activities.forEach((a) => {
            if (a.time) m.set(a.time, a.activity_status || 'not_done');
          });
          map.set(row.date, m);
        });
        setStatusMap(map);
      } catch {
        /* abaikan */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isoDates.join(',')]);

  const rangeLabel = `${weekDays[0].getDate()} – ${weekDays[4].getDate()} ${MONTHS_ID[weekDays[4].getMonth()]} ${weekDays[4].getFullYear()}`;
  const activeDays = [...statusMap.values()].filter((m) => [...m.values()].some((s) => s === 'done' || s === 'partial')).length;

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <Activity size={18} className="text-hana-teal-700" /> {title}
        </h2>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; })} className="p-1 rounded-md hover:bg-elevated text-text-secondary" aria-label="Minggu sebelumnya">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-medium text-text-secondary tabular-nums whitespace-nowrap">{rangeLabel}</span>
          <button onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; })} className="p-1 rounded-md hover:bg-elevated text-text-secondary" aria-label="Minggu berikutnya">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-64" />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[420px]">
            {/* Header hari */}
            <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '52px repeat(5, 1fr)' }}>
              <div />
              {weekDays.map((d) => {
                const iso = formatDateISO(d);
                return (
                  <div key={iso} className={clsx('text-center text-[10px] font-semibold leading-tight py-0.5 rounded', iso === today ? 'bg-hana-teal-500/10 text-hana-teal-700' : 'text-text-secondary')}>
                    {DAY_SHORT[d.getDay()]}<br />
                    <span className="text-text-muted font-normal">{d.getDate()}/{d.getMonth() + 1}</span>
                  </div>
                );
              })}
            </div>

            {/* Baris per slot jam */}
            {slots.map((slot) => (
              <div key={slot.time} className="grid gap-1 mb-1 items-center" style={{ gridTemplateColumns: '52px repeat(5, 1fr)' }}>
                <div className="text-[10px] text-text-muted text-right pr-1 tabular-nums">{slot.time}</div>
                {weekDays.map((d) => {
                  const iso = formatDateISO(d);
                  const future = iso > today;
                  const status = statusMap.get(iso)?.get(slot.time);
                  const color = future ? null : status ? STATUS_COLOR[status] : EMPTY;
                  return (
                    <div
                      key={iso}
                      title={future ? '' : `${slot.label} · ${DAY_SHORT[d.getDay()]} ${d.getDate()} · ${status ? STATUS_LABEL[status] : 'tidak ada data'}`}
                      className={clsx('h-7 rounded-md border transition-transform hover:scale-[1.06]', future && 'border-dashed')}
                      style={{
                        backgroundColor: future ? 'transparent' : color,
                        borderColor: future ? '#E2E8F0' : status ? color : '#E2E8F0',
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[10px] text-text-muted">
        <span>{activeDays} hari aktif minggu ini</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: STATUS_COLOR.done }} /> Selesai</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: STATUS_COLOR.partial }} /> Sebagian</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: STATUS_COLOR.not_done }} /> Terlewat</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-[3px] border border-hana-border" style={{ backgroundColor: EMPTY }} /> Kosong</span>
      </div>
    </div>
  );
}
