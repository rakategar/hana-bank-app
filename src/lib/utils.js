// ── Date & Week helpers ───────────────────────────────────

export function todayISO() {
  return formatDateISO(new Date());
}

export function formatDateISO(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ISO week id, contoh: "2026-W22"
export function currentWeekId(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

const ID_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const ID_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function formatDateID(dateStr) {
  const d = new Date(dateStr);
  return `${ID_DAYS[d.getDay()]}, ${d.getDate()} ${ID_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// 10 hari terakhir (termasuk hari ini), urut lama → baru
export function lastNDates(n = 10, endDate = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    out.push(formatDateISO(d));
  }
  return out;
}

// ── Score helpers ─────────────────────────────────────────

export const SCORE_LEVELS = {
  1: { key: 'CRITICAL', label: 'CRITICAL', color: '#EF4444', tw: 'score-1' },
  2: { key: 'RECOVERY', label: 'RECOVERY', color: '#F97316', tw: 'score-2' },
  3: { key: 'ON TRACK', label: 'ON TRACK', color: '#3B82F6', tw: 'score-3' },
  4: { key: 'HIGH IMPACT', label: 'HIGH IMPACT', color: '#22C55E', tw: 'score-4' },
};

// terima level string ("on_track", "ON TRACK") atau score number
export function levelInfo(value) {
  if (typeof value === 'number') {
    return SCORE_LEVELS[Math.max(1, Math.min(4, Math.round(value)))];
  }
  if (typeof value === 'string') {
    const norm = value.toUpperCase().replace(/_/g, ' ').trim();
    const found = Object.values(SCORE_LEVELS).find((l) => l.label === norm);
    if (found) return found;
  }
  return null;
}

export function scoreColor(score) {
  const info = levelInfo(typeof score === 'number' ? score : Number(score));
  return info ? info.color : '#52616B';
}

export function levelFromAverage(avg) {
  if (avg == null) return null;
  return SCORE_LEVELS[Math.max(1, Math.min(4, Math.round(avg)))];
}

// ── Misc ──────────────────────────────────────────────────

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export const ROLE_LABELS = {
  FA: 'Financial Advisor',
  FWSS: 'Field Working Sales Supervisor',
  BM: 'Branch Manager',
  RH: 'Regional Head',
};

export function debounce(fn, ms = 300) {
  let t;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.cancel = () => clearTimeout(t);
  return wrapped;
}

export function clsx(...args) {
  return args.filter(Boolean).join(' ');
}
