import { slotsForRole } from '../constants/timeSlots';
import { levelInfo } from './utils';

// ── Template hasil aktivitas dummy per role ───────────────

const FA_DUMMY = {
  '07:30': { actual: 'Briefing dilakukan, target 4 appointment ditetapkan. Action plan dibagi per slot.', status: 'done', notes: 'Ada 2 hot prospect dari referral kemarin.' },
  '08:00': { actual: 'Review pipeline: 5 HOT prospect teridentifikasi. Next action jelas untuk masing-masing.', status: 'done', notes: 'Prioritas: Pak Budi (Sunter), Bu Ani (Kelapa Gading)' },
  '09:00': { actual: '12 engagement dilakukan, 3 appointment berhasil dijadwalkan.', status: 'done', notes: '1 prospect minta reschedule ke besok.' },
  '10:00': { actual: '4 lead baru dari referral nasabah existing. 1 lead sangat potensial.', status: 'done', notes: 'Referral dari Bu Tini — potensi tabungan 200jt' },
  '11:00': { actual: '2 meeting terlaksana. Product presentation berjalan baik, nasabah antusias.', status: 'done', notes: 'Bu Ani tertarik produk deposito 6 bulan.' },
  '12:00': { actual: 'Persiapan aplikasi untuk 1 calon nasabah hampir selesai, ada 1 dokumen kurang.', status: 'partial', notes: 'Tunggu KTP suami dari Bu Ani.' },
  '13:00': { actual: 'Midday check: 2 slot masih tertinggal. Recovery: reschedule 1 meeting sore.', status: 'partial', notes: 'Pipeline bergerak tapi perlu push di closing.' },
  '14:00': { actual: '1 meeting advisory berjalan sangat baik. Nasabah setuju untuk produk investasi.', status: 'done', notes: 'Conversion kemungkinan besar besok.' },
  '15:00': { actual: '4 follow up closing aktif. 1 sudah konfirmasi mau deal.', status: 'done', notes: 'Pak Budi konfirmasi mau buka rekening besok pagi.' },
  '16:00': { actual: 'CRM diupdate 95%. Semua aktivitas hari ini terdokumentasi.', status: 'done', notes: '' },
  '17:00': { actual: 'Sales coaching 30 menit dengan FWSS. Feedback diterima dan action plan disusun.', status: 'done', notes: 'Fokus besok: closing Pak Budi + follow up Bu Ani' },
  '18:00': { actual: 'Review harian: 4 dari 5 target tercapai. Pipeline untuk besok sudah terkunci.', status: 'done', notes: 'Target besok: closing 1, appointment baru 3.' },
};

const FWSS_DUMMY = {
  '07:30': { actual: 'Recovery direction diberikan ke 2 FA, target harian dikunci.', status: 'done', notes: 'Fokus recovery FA yang tertinggal kemarin.' },
  '08:00': { actual: 'Pipeline 2 FA dikontrol. Andi 5 hot, Sari 3 hot prospect.', status: 'done', notes: 'Sari perlu tambah prospek baru.' },
  '09:00': { actual: 'Aktivasi pagi: kedua FA mulai tele-appointment tepat waktu.', status: 'done', notes: '' },
  '10:00': { actual: 'Identifikasi peluang cabang, 2 lead walk-in diarahkan ke FA.', status: 'done', notes: 'Lead walk-in potensi KPR.' },
  '11:00': { actual: 'Case review dengan Sari: objection handling deposito dibahas.', status: 'partial', notes: 'Perlu role-play lanjutan sore.' },
  '12:00': { actual: 'Recovery coaching singkat, hasil pagi ditekankan.', status: 'done', notes: '' },
  '13:00': { actual: 'Joint meeting dengan Andi ke nasabah prioritas, assisted closing.', status: 'done', notes: 'Nasabah cenderung deal besok.' },
  '14:00': { actual: 'Monitoring siang, intervensi ke Sari yang tertinggal 2 slot.', status: 'partial', notes: 'Sari butuh dorongan di closing.' },
  '15:00': { actual: 'Closing push ke kedua FA, 2 deal dalam proses konfirmasi.', status: 'done', notes: '' },
  '16:00': { actual: 'CRM kedua FA dicek, disiplin input baik.', status: 'done', notes: 'Andi 100%, Sari 90%.' },
  '17:00': { actual: 'Sales clinic 45 menit, fokus teknik closing.', status: 'done', notes: 'Materi: handling objection harga.' },
  '18:00': { actual: 'End day accountability: review hasil 2 FA, arah besok jelas.', status: 'done', notes: 'Target tim besok: 3 closing.' },
};

const BM_DUMMY = {
  '07:30': { actual: 'Business direction harian disampaikan, alignment dengan 2 FWSS.', status: 'done', notes: 'Fokus cabang: akselerasi funding.' },
  '08:00': { actual: 'Pipeline kedua tim dimonitor, prioritas case besar didukung.', status: 'done', notes: 'Case KPR 2M jadi prioritas.' },
  '09:00': { actual: 'Morning support ke FWSS, reinforcement target mingguan.', status: 'done', notes: '' },
  '10:00': { actual: 'Koordinasi cabang Pusat & Selatan, sinkronisasi peluang.', status: 'done', notes: '' },
  '11:00': { actual: 'Dukung case high-potential nasabah korporat bersama FWSS-1.', status: 'partial', notes: 'Menunggu approval kredit.' },
  '12:00': { actual: 'Business reinforcement, momentum tim dijaga.', status: 'done', notes: '' },
  '13:00': { actual: 'Joint meeting closing support ke nasabah prioritas FWSS-2.', status: 'done', notes: 'Deposito 500jt hampir closing.' },
  '14:00': { actual: 'Midday monitoring, recovery support untuk tim Selatan.', status: 'partial', notes: 'Tim Selatan agak tertinggal.' },
  '15:00': { actual: 'Eskalasi approval kredit ditangani, closing assistance diberikan.', status: 'done', notes: '' },
  '16:00': { actual: 'Validasi CRM kedua tim, data aktivitas akurat.', status: 'done', notes: '' },
  '17:00': { actual: 'Business review sore, reinforcement ke 2 FWSS.', status: 'done', notes: '' },
  '18:00': { actual: 'End day review, planning besok disusun bersama FWSS.', status: 'done', notes: 'Target besok: 2 closing besar.' },
};

function templatesForRole(role) {
  switch (role) {
    case 'FWSS':
      return FWSS_DUMMY;
    case 'BM':
      return BM_DUMMY;
    case 'FA':
    default:
      return FA_DUMMY;
  }
}

const STATUS_MAP = { done: 'done', partial: 'partial', not_done: 'not_done' };

// Bangun array activities dummy untuk daily_activities.activities (JSONB)
export function generateDummyActivities(role) {
  const slots = slotsForRole(role);
  const templates = templatesForRole(role);
  return slots.map(({ time, label }) => {
    const t = templates[time] || { actual: 'Aktivitas terlaksana sesuai rencana.', status: 'done', notes: '' };
    return {
      time,
      label,
      planned: '',
      actual: t.actual,
      activity_status: STATUS_MAP[t.status] || 'done',
      notes: t.notes || '',
      image_path: null,
      image_url: null,
    };
  });
}

// Skor dari status: done→4/3, partial→2, not_done→1 (variatif)
function scoreFromStatus(status, idx) {
  if (status === 'not_done') return 1;
  if (status === 'partial') return 2;
  // done → kebanyakan 3, sebagian 4 (variasi deterministik)
  return idx % 3 === 0 ? 4 : 3;
}

const REASONINGS = {
  4: 'Eksekusi sangat baik, target tercapai dengan dampak tinggi.',
  3: 'Aktivitas berjalan sesuai rencana dan on track.',
  2: 'Sebagian tercapai, masih ada gap yang perlu recovery.',
  1: 'Tidak terlaksana, perlu perhatian dan tindakan segera.',
};
const RECOMMENDATIONS = {
  4: 'Pertahankan momentum dan replikasi ke slot lain.',
  3: 'Tingkatkan kualitas agar naik ke high impact.',
  2: 'Susun recovery action konkret untuk besok.',
  1: 'Prioritaskan slot ini besok dengan target jelas.',
};

// Bangun objek ai_scores dummy berdasarkan activities
export function generateDummyScores(role, activities) {
  const scores = activities.map((a, idx) => {
    const score = scoreFromStatus(a.activity_status, idx);
    const info = levelInfo(score);
    return {
      time: a.time,
      label: a.label,
      score,
      level: info.label,
      reasoning: REASONINGS[score],
      recommendation: RECOMMENDATIONS[score],
    };
  });
  const avg = scores.reduce((s, x) => s + x.score, 0) / scores.length;
  const dailyAvg = Math.round(avg * 100) / 100;
  const dailyLevel = levelInfo(dailyAvg).label;
  return {
    scores,
    daily_average: dailyAvg,
    daily_level: dailyLevel,
    summary:
      'Performa hari ini tergolong ' +
      dailyLevel +
      '. Mayoritas aktivitas terlaksana baik, beberapa slot perlu penguatan recovery.',
    overall_recommendation:
      'Fokus besok: tutup gap pada slot partial/not done dan jaga konsistensi closing.',
  };
}

// ── Weekly plan dummy ─────────────────────────────────────

const PROSPECTS = ['Pak Budi Sunter', 'Bu Ani Kelapa Gading', 'Pak Joko Cempaka', 'Bu Tini Sunter', 'Pak Hasan Menteng', 'Bu Rina PIK', 'Pak Dedi Pluit', 'Bu Sari Tebet', 'Pak Anwar Kemang', 'Bu Lia Senayan', 'Pak Rudi Cikini', 'Bu Wati Kuningan'];
const LOCATIONS = ['Cabang Jakarta Pusat', 'Kelapa Gading', 'Sunter', 'Kemang', 'PIK', 'Menteng', 'Tebet', 'Pluit', 'Senayan', 'Kuningan', 'Cikini', 'Cempaka Putih'];

const PLAN_OBJECTIVES = {
  FA: 'Targetkan 1 closing & 2 appointment baru, fokus produk tabungan/deposito.',
  FWSS: 'Kawal 2 FA agar capai target, dorong recovery pipeline & assisted closing.',
  BM: 'Pastikan tim cabang on track, dukung case high-potential & koordinasi peluang.',
};

const DURATIONS = [30, 45, 60];

// Bangun slots dummy untuk SATU hari (weekly_plans.slots[dayKey])
export function generateDummyWeeklyPlan(role, dayIndex = 0) {
  const slots = slotsForRole(role);
  return slots.map((s, i) => ({
    time: s.time,
    label: s.label,
    prospect: PROSPECTS[(i + dayIndex) % PROSPECTS.length],
    location: LOCATIONS[(i + dayIndex) % LOCATIONS.length],
    objective: PLAN_OBJECTIVES[role] || PLAN_OBJECTIVES.FA,
    duration: DURATIONS[(i + dayIndex) % DURATIONS.length],
  }));
}
