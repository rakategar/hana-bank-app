import { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchActivitiesForDates } from '../lib/db';
import { slotsForRole } from '../constants/timeSlots';
import { formatDateISO, nowDate, clsx } from '../lib/utils';
import { Modal } from './ui';

const DAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const STATUS_LABEL = { done: 'Selesai', partial: 'Sebagian', not_done: 'Terlewat' };

// Monday of the week containing `date`
function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d;
}

export default function ActivityWatch({ userId, role = 'FA', title = 'Activity Watch', date }) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(date || nowDate()));
  const [statusMap, setStatusMap] = useState(new Map()); // date → Map(time → status)
  const [loading, setLoading] = useState(true);

  // Custom DatePicker modal states
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date(weekStart));

  const slots = slotsForRole(role);
  const today = formatDateISO(nowDate());

  // Monday to Friday of selected week
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
        /* ignore */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isoDates.join(',')]);

  const rangeLabel = `${weekDays[0].getDate()} – ${weekDays[4].getDate()} ${MONTHS_ID[weekDays[4].getMonth()]} ${weekDays[4].getFullYear()}`;
  const activeDays = [...statusMap.values()].filter((m) => [...m.values()].some((s) => s === 'done' || s === 'partial')).length;

  // Custom Calendar computations
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  
  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  
  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfMonth(viewYear, viewMonth);

  const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const DAYS_LABEL = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const prevMonth = () => setViewDate(new Date(viewYear, viewMonth - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewYear, viewMonth + 1, 1));

  const handleSelectDate = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    setWeekStart(mondayOf(d));
    setOpenDatePicker(false);
  };

  return (
    <div className="card">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 border-b border-hana-border/30 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-hana-teal-50 text-hana-teal-700 border border-hana-teal-100/50">
            <Activity size={18} />
          </div>
          <div>
            <h2 className="font-display text-base font-extrabold text-ink leading-tight">{title}</h2>
            <p className="text-xs text-text-muted mt-0.5">Timeline aktivitas harian dari pagi hingga sore hari.</p>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <button
            onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; })}
            className="p-1.5 rounded-xl border border-hana-border/60 hover:bg-slate-50 text-text-secondary transition-colors cursor-pointer"
            aria-label="Minggu sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>
          
          <button
            type="button"
            onClick={() => {
              setViewDate(new Date(weekStart));
              setOpenDatePicker(true);
            }}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-ink whitespace-nowrap shadow-sm hover:shadow-raised transition-all cursor-pointer flex items-center justify-center min-w-[130px]"
          >
            <span>{rangeLabel}</span>
          </button>
          
          <button
            onClick={() => setWeekStart((d) => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; })}
            className="p-1.5 rounded-xl border border-hana-border/60 hover:bg-slate-50 text-text-secondary transition-colors cursor-pointer"
            aria-label="Minggu berikutnya"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-[200px] rounded-2xl" />
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6">
          <div className="min-w-[640px] py-1">
            
            {/* Header: Time Slots (Columns) */}
            <div className="grid gap-2 mb-2 items-center" style={{ gridTemplateColumns: '76px repeat(12, 1fr)' }}>
              <div />
              {slots.map((slot) => (
                <div key={slot.time} className="text-[10px] font-bold text-text-muted text-center tabular-nums leading-none">
                  {slot.time}
                </div>
              ))}
            </div>

            {/* Rows: Days of the Week */}
            <div className="space-y-2">
              {weekDays.map((d) => {
                const iso = formatDateISO(d);
                const isToday = iso === today;
                return (
                  <div
                    key={iso}
                    className="grid gap-2 items-center"
                    style={{ gridTemplateColumns: '76px repeat(12, 1fr)' }}
                  >
                    {/* Day & Date label */}
                    <div
                      className={clsx(
                        'text-left py-1.5 px-2 rounded-xl transition-all duration-200 flex flex-col justify-center border leading-none shadow-sm',
                        isToday 
                          ? 'bg-hana-teal-50 border-hana-teal-200/60 text-hana-teal-700 font-extrabold' 
                          : 'bg-slate-50/50 border-hana-border/20 text-text-secondary'
                      )}
                    >
                      <span className="text-[8px] font-bold tracking-wider uppercase">
                        {DAY_SHORT[d.getDay()]}
                      </span>
                      <span className={clsx(
                        'text-[10px] font-extrabold mt-0.5 truncate',
                        isToday ? 'text-hana-teal-850 font-black' : 'text-ink'
                      )}>
                        {d.getDate()} {MONTHS_ID[d.getMonth()]}
                      </span>
                    </div>

                    {/* Status blocks per hour slot */}
                    {slots.map((slot) => {
                      const future = iso > today;
                      const status = statusMap.get(iso)?.get(slot.time);
                      return (
                        <div
                          key={slot.time}
                          title={future ? '' : `${slot.label} · ${DAY_SHORT[d.getDay()]} ${d.getDate()} · ${status ? STATUS_LABEL[status] : 'tidak ada data'}`}
                          className={clsx(
                            'h-8 rounded-lg border transition-all duration-200 hover:scale-[1.08] hover:shadow-sm cursor-pointer',
                            future ? 'border-dashed border-slate-200 bg-transparent' : 
                            status === 'done' ? 'bg-emerald-500/90 border-emerald-600/10 shadow-sm' :
                            status === 'partial' ? 'bg-amber-500/90 border-amber-600/10 shadow-sm' :
                            status === 'not_done' ? 'bg-rose-500 border-rose-600/15 shadow-sm' :
                            'bg-slate-100 border-slate-200/50'
                          )}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* Legend & Details */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 mt-5 pt-4 border-t border-hana-border/30 text-[10px] font-bold text-text-muted">
        <span className="inline-flex items-center gap-1.5 bg-hana-teal-50 border border-hana-teal-100/50 rounded-full px-3 py-1 text-hana-teal-700 font-extrabold shadow-sm">
          {activeDays} Hari Aktif Minggu Ini
        </span>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-[4px] bg-emerald-500 border border-emerald-600/10 shadow-sm shrink-0" />
            <span>Selesai</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-[4px] bg-amber-500 border border-amber-600/10 shadow-sm shrink-0" />
            <span>Sebagian</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-[4px] bg-rose-500 border border-rose-600/15 shadow-sm shrink-0" />
            <span>Terlewat</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-[4px] bg-slate-100 border border-slate-200/50 shrink-0" />
            <span>Kosong</span>
          </span>
        </div>
      </div>

      {/* Reusable Premium Calendar Modal */}
      <Modal
        open={openDatePicker}
        onClose={() => setOpenDatePicker(false)}
        title="Pilih Tanggal Laporan"
        maxWidth="max-w-sm"
      >
        <div className="p-1">
          {/* Month/Year Header */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="grid h-9 w-9 place-items-center rounded-xl border border-hana-border bg-white text-text-secondary hover:bg-elevated hover:text-ink transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="font-display text-base font-extrabold text-ink">
              {MONTHS_FULL[viewMonth]} {viewYear}
            </p>
            <button
              onClick={nextMonth}
              className="grid h-9 w-9 place-items-center rounded-xl border border-hana-border bg-white text-text-secondary hover:bg-elevated hover:text-ink transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day Labels */}
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {DAYS_LABEL.map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const d = new Date(viewYear, viewMonth, day);
              const t = d.getTime();
              const wStart = new Date(weekStart).setHours(0, 0, 0, 0);
              const wEnd = new Date(weekStart);
              wEnd.setDate(wEnd.getDate() + 4);
              wEnd.setHours(23, 59, 59, 999);
              
              const isSelected = t >= wStart && t <= wEnd.getTime();
              const isCurrDay = d.toDateString() === weekStart.toDateString(); // highlight Monday (weekstart)
              
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDate(day)}
                  className={clsx(
                    'grid h-9 w-9 place-items-center rounded-xl text-xs font-bold transition-all cursor-pointer',
                    isCurrDay
                      ? 'bg-hana-teal-500 text-white shadow-md'
                      : isSelected
                      ? 'bg-hana-teal-50 text-hana-teal-700 hover:bg-hana-teal-100/50'
                      : 'text-text-secondary hover:bg-slate-50 hover:text-ink'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
