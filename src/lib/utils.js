import { DEFAULT_DURATION, MAX_DURATION } from './appMode';

// Re-export agar konsumen lama (import dari utils) tetap berfungsi.
export { DEFAULT_DURATION, MAX_DURATION };

// ── Demo clock (hanya aktif di mode demo) ─────────────────
// State modul agar helper tanggal/waktu bisa mengikuti waktu demo.
// Di mode live, setDemoNow tidak pernah dipanggil → nowDate() = waktu nyata.
let _demoNow = null;

export function setDemoNow(value) {
  _demoNow = value ? new Date(value) : null;
}
export function clearDemoNow() {
  _demoNow = null;
}
export function isDemoNowSet() {
  return _demoNow != null;
}
// "Sekarang" — waktu demo bila diatur, selain itu waktu sistem nyata.
export function nowDate() {
  return _demoNow ? new Date(_demoNow) : new Date();
}

// ── Date & Week helpers ───────────────────────────────────

export function todayISO() {
  return formatDateISO(nowDate());
}

export function formatDateISO(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ISO week id, contoh: "2026-W22"
export function currentWeekId(date = nowDate()) {
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
export function lastNDates(n = 10, endDate = nowDate()) {
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

// ── Score visibility ──────────────────────────────────────
// Aturan: seseorang TIDAK boleh melihat skor dirinya sendiri.
// Atasan boleh melihat skor bawahannya (viewer != target).
export function canViewScoreOf(viewerId, targetId) {
  return Boolean(viewerId && targetId && viewerId !== targetId);
}

// Warna untuk completion heatmap (intensitas teal sesuai % terisi)
export function completionColor(ratio) {
  if (ratio == null || ratio <= 0) return null;
  if (ratio < 0.4) return '#CDF0E9';
  if (ratio < 0.7) return '#7FD9C6';
  if (ratio < 1) return '#2FBFA3';
  return '#04B292';
}

// ── Penjadwalan harian (Senin–Jumat) ──────────────────────
// Durasi default & maksimal tergantung mode (live: 30m, demo: longgar).
// Diimpor lalu di-re-export agar tersedia sebagai binding lokal (dipakai slotWindow).
export const GRACE_MINUTES = 30; // toleransi setelah durasi

export const WEEKDAYS = [
  { key: 'monday', label: 'Senin', dow: 1 },
  { key: 'tuesday', label: 'Selasa', dow: 2 },
  { key: 'wednesday', label: 'Rabu', dow: 3 },
  { key: 'thursday', label: 'Kamis', dow: 4 },
  { key: 'friday', label: 'Jumat', dow: 5 },
];

export function dayKeyFromDate(date = nowDate()) {
  const dow = new Date(date).getDay();
  return WEEKDAYS.find((w) => w.dow === dow)?.key || null;
}
export function dayLabel(key) {
  return WEEKDAYS.find((w) => w.key === key)?.label || key;
}

// ── Time-gating aktivitas ─────────────────────────────────
export function fmtClock(d) {
  const h = String(new Date(d).getHours()).padStart(2, '0');
  const m = String(new Date(d).getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// Jendela waktu sebuah slot: [start, start + durasi + grace]
export function slotWindow(dateStr, time, durationMin = DEFAULT_DURATION) {
  const [h, m] = String(time).split(':').map(Number);
  const start = new Date(`${dateStr}T00:00:00`);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + (Number(durationMin || 0) + GRACE_MINUTES) * 60000);
  return { start, end };
}

// 'upcoming' (belum waktunya) | 'open' (bisa input) | 'closed' (terlewat)
export function slotWindowState(dateStr, time, durationMin, now = nowDate()) {
  const { start, end } = slotWindow(dateStr, time, durationMin);
  const t = new Date(now).getTime();
  if (t < start.getTime()) return 'upcoming';
  if (t > end.getTime()) return 'closed';
  return 'open';
}

// ── Serialisasi data form terstruktur ─────────────────────
// Mengubah object { key: value | [items] } menjadi teks ringkas untuk
// ditampilkan & dikirim ke Gemini. usersById (opsional) memetakan id user
// → nama agar user-select tampil sebagai nama, bukan id mentah.
export function serializeStructuredData(data, usersById = null) {
  if (!data || typeof data !== 'object') return '';
  const resolve = (v) => (usersById && usersById[v] ? usersById[v] : v);
  const parts = [];
  for (const [key, v] of Object.entries(data)) {
    if (v == null || v === '') continue;
    const label = key.replace(/_/g, ' ');
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      const items = v
        .map((item) => {
          if (item && typeof item === 'object') {
            return Object.values(item).map(resolve).filter((x) => x != null && x !== '').join(', ');
          }
          return resolve(item);
        })
        .filter(Boolean);
      if (items.length) parts.push(`${label}: [${items.join(' | ')}]`);
    } else {
      parts.push(`${label}: ${resolve(v)}`);
    }
  }
  return parts.join('; ');
}

// Apakah object data form punya minimal satu nilai terisi.
export function isStructuredFilled(data) {
  if (!data || typeof data !== 'object') return false;
  return Object.values(data).some((v) => (Array.isArray(v) ? v.length > 0 : v != null && v !== ''));
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
