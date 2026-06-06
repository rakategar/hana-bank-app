// Template 12 time slot per role (dari PDF program ICU Class)

export const FA_SLOTS = [
  { time: '07:30', endTime: '08:00', label: 'Morning Briefing & Target Commitment' },
  { time: '08:00', endTime: '09:00', label: 'Pipeline Review & Prioritas Nasabah' },
  { time: '09:00', endTime: '10:00', label: 'Tele-Appointment & Customer Engagement' },
  { time: '10:00', endTime: '11:00', label: 'Prospecting & Referral Sourcing' },
  { time: '11:00', endTime: '12:00', label: 'Customer Meeting & Product Presentation' },
  { time: '12:00', endTime: '13:00', label: 'Persiapan Meeting & Kelengkapan Aplikasi' },
  { time: '13:00', endTime: '14:00', label: 'Midday Checkpoint & Recovery Action' },
  { time: '14:00', endTime: '15:00', label: 'Customer Meeting & Advisory Session' },
  { time: '15:00', endTime: '16:00', label: 'Closing Follow Up & Objection Handling' },
  { time: '16:00', endTime: '17:00', label: 'Update CRM & Submit Activity' },
  { time: '17:00', endTime: '18:00', label: 'Sales Coaching & Skill Practice' },
  { time: '18:00', endTime: '19:00', label: 'Evening Review & Pipeline Lock Besok' },
];

export const FWSS_SLOTS = [
  { time: '07:30', endTime: '08:00', label: 'Morning Briefing & Daily Recovery Direction' },
  { time: '08:00', endTime: '09:00', label: 'Pipeline Control & FA Monitoring' },
  { time: '09:00', endTime: '10:00', label: 'Morning Activation & Sales Recovery' },
  { time: '10:00', endTime: '11:00', label: 'Branch Opportunity & Lead Activation' },
  { time: '11:00', endTime: '12:00', label: 'Case Review & Solution Discussion' },
  { time: '12:00', endTime: '13:00', label: 'Recovery Coaching & Result Enforcement' },
  { time: '13:00', endTime: '14:00', label: 'Joint Meeting & Assisted Closing' },
  { time: '14:00', endTime: '15:00', label: 'Midday Monitoring & Recovery Intervention' },
  { time: '15:00', endTime: '16:00', label: 'Closing Push & Conversion Acceleration' },
  { time: '16:00', endTime: '17:00', label: 'CRM Monitoring & Activity Discipline' },
  { time: '17:00', endTime: '18:00', label: 'Sales Clinic & Recovery Reinforcement' },
  { time: '18:00', endTime: '19:00', label: 'End Day Accountability & Direction' },
];

export const BM_SLOTS = [
  { time: '07:30', endTime: '08:00', label: 'Morning Briefing & Business Direction' },
  { time: '08:00', endTime: '09:00', label: 'Pipeline Monitoring & Priority Support' },
  { time: '09:00', endTime: '10:00', label: 'Morning Support & Team Reinforcement' },
  { time: '10:00', endTime: '11:00', label: 'Branch Coordination & Business Opportunity' },
  { time: '11:00', endTime: '12:00', label: 'Support High Potential Customer Case' },
  { time: '12:00', endTime: '13:00', label: 'Business Reinforcement & Team Support' },
  { time: '13:00', endTime: '14:00', label: 'Joint Meeting & Closing Support' },
  { time: '14:00', endTime: '15:00', label: 'Midday Monitoring & Recovery Support' },
  { time: '15:00', endTime: '16:00', label: 'Escalation Support & Closing Assistance' },
  { time: '16:00', endTime: '17:00', label: 'CRM Monitoring & Activity Validation' },
  { time: '17:00', endTime: '18:00', label: 'Business Review & Team Reinforcement' },
  { time: '18:00', endTime: '19:00', label: 'End Day Review & Planning Besok' },
];

export function slotsForRole(role) {
  switch (role) {
    case 'FWSS':
      return FWSS_SLOTS;
    case 'BM':
      return BM_SLOTS;
    case 'FA':
    default:
      return FA_SLOTS;
  }
}

// ── Form schema kontekstual per slot ──────────────────────
// Setiap slot punya field unik sesuai konteks jam-nya. Field types:
//   text | textarea | number | select | user-select | list
//   user-select.source: 'supervisor' (atasan langsung) | 'subordinate' (bawahan)
//   user-select.multi: true → pilih banyak (array of id)
//   list.itemSchema: array field untuk tiap baris; list.addLabel: teks tombol
// Schema yang sama dipakai untuk RENCANA (Weekly Plan) & AKTUAL (Daily Input).

// Helper ringkas pendefinisian field
const T = (key, label, placeholder = '') => ({ key, type: 'text', label, placeholder });
const TA = (key, label, placeholder = '', rows = 2) => ({ key, type: 'textarea', label, placeholder, rows });
const N = (key, label, placeholder = '') => ({ key, type: 'number', label, placeholder, min: 0 });
const S = (key, label, options) => ({ key, type: 'select', label, options });
const SUP = (key, label) => ({ key, type: 'user-select', label, source: 'supervisor' });
const SUB = (key, label, multi = false) => ({ key, type: 'user-select', label, source: 'subordinate', multi });
const LIST = (key, label, itemSchema, addLabel = 'Tambah Baris', resultSchema = []) =>
  ({ key, type: 'list', label, itemSchema, addLabel, resultSchema });

// Result fields ditambahkan per item saat Daily Input (actual mode)
const RESULT_SCHEMA = [
  S('status_aktual', 'Hasil', ['berhasil', 'tidak_berhasil', 'partial', 'reschedule']),
  T('catatan_aktual', 'Catatan', 'Keterangan singkat'),
];

const FA_FORMS = {
  '07:30': [SUP('briefing_with', 'Briefing dengan (FWSS)'), T('daily_target', 'Target Harian', 'mis. 4 appointment'), TA('action_plan', 'Action Plan', 'Rincian rencana aksi hari ini')],
  '08:00': [LIST('leads', 'Daftar Lead Prioritas', [T('nama', 'Nama Nasabah'), T('produk', 'Produk'), S('status', 'Status', ['cold', 'warm', 'hot', 'closing']), S('prioritas', 'Prioritas', ['rendah', 'sedang', 'tinggi'])], 'Tambah Lead', RESULT_SCHEMA)],
  '09:00': [N('target_appointment', 'Target Appointment'), LIST('calls', 'Daftar Appointment', [T('nama', 'Nama Nasabah'), S('tujuan', 'Tujuan', ['appointment', 'follow-up', 'warm-up', 'konfirmasi'])], 'Tambah Appointment', RESULT_SCHEMA)],
  '10:00': [N('target_prospect', 'Target Prospecting Baru'), LIST('prospects', 'Daftar Prospecting', [T('nama', 'Nama'), S('sumber', 'Sumber', ['referral', 'walk-in', 'cold-call', 'eks-nasabah']), T('kontak', 'Kontak')], 'Tambah Prospecting', RESULT_SCHEMA)],
  '11:00': [T('nama_nasabah', 'Nama Nasabah'), T('lokasi', 'Lokasi Meeting'), T('produk_presentasi', 'Produk Dipresentasikan'), TA('tujuan_meeting', 'Tujuan Meeting')],
  '12:00': [T('nama_nasabah', 'Nama Nasabah'), T('jam_meeting', 'Jam Meeting Berikutnya'), TA('kelengkapan_dokumen', 'Kelengkapan Dokumen / Aplikasi')],
  '13:00': [T('pencapaian_siang', 'Pencapaian s/d Siang'), T('gap_target', 'Gap dari Target'), TA('recovery_action', 'Recovery Action')],
  '14:00': [T('nama_nasabah', 'Nama Nasabah'), T('lokasi', 'Lokasi'), T('topik_advisory', 'Topik Advisory'), TA('target_session', 'Target Sesi')],
  '15:00': [LIST('follow_ups', 'Follow Up Closing', [T('nama', 'Nama Nasabah'), T('objection', 'Objection'), T('rencana_handling', 'Rencana Handling')], 'Tambah Follow Up', RESULT_SCHEMA)],
  '16:00': [N('pipeline_count', 'Jumlah Pipeline di CRM'), TA('summary_update', 'Ringkasan Update CRM')],
  '17:00': [T('topik_coaching', 'Topik Coaching'), SUP('coach_oleh', 'Coach oleh (FWSS)'), TA('poin_pelajaran', 'Poin Pelajaran')],
  '18:00': [TA('ringkasan_hari', 'Ringkasan Hari Ini'), T('priority_besok', 'Prioritas Besok'), LIST('pipeline_besok', 'Pipeline Besok', [T('nama', 'Nama Nasabah'), T('action', 'Action')], 'Tambah Pipeline', RESULT_SCHEMA)],
};

const FWSS_FORMS = {
  '07:30': [T('target_tim', 'Target Tim'), LIST('fa_arahan', 'Arahan per FA', [SUB('fa_id', 'FA'), TA('arahan', 'Arahan & Fokus Recovery')], 'Tambah FA', RESULT_SCHEMA)],
  '08:00': [LIST('fa_pipeline', 'Kontrol Pipeline FA', [SUB('fa_id', 'FA'), T('status_pipeline', 'Status Pipeline'), T('tindakan', 'Tindakan')], 'Tambah FA', RESULT_SCHEMA)],
  '09:00': [LIST('fa_recovery', 'Aktivasi per FA', [SUB('fa_id', 'FA'), TA('recovery_plan', 'Recovery Plan'), T('target_aktivasi', 'Target Aktivasi')], 'Tambah FA', RESULT_SCHEMA)],
  '10:00': [T('sumber_opportunity', 'Sumber Opportunity'), LIST('leads', 'Lead Cabang', [T('nama', 'Nama Lead'), SUB('fa_ditugaskan', 'FA Ditugaskan')], 'Tambah Lead', RESULT_SCHEMA)],
  '11:00': [LIST('fa_cases', 'Review Kasus per FA', [SUB('fa_id', 'FA'), TA('kasus', 'Kasus'), TA('solusi', 'Solusi')], 'Tambah FA', RESULT_SCHEMA)],
  '12:00': [LIST('fa_coaching', 'Coaching per FA', [SUB('fa_id', 'FA'), T('topik_coaching', 'Topik Coaching'), T('target_recovery', 'Target Recovery')], 'Tambah FA', RESULT_SCHEMA)],
  '13:00': [LIST('fa_joint', 'Joint Meeting per FA', [SUB('fa_id', 'FA'), T('nama_nasabah', 'Nama Nasabah'), T('produk', 'Produk'), TA('tujuan_joint', 'Tujuan Joint Meeting')], 'Tambah FA', RESULT_SCHEMA)],
  '14:00': [LIST('fa_status', 'Monitoring FA', [SUB('fa_id', 'FA'), T('pencapaian', 'Pencapaian'), T('intervensi', 'Intervensi')], 'Tambah FA', RESULT_SCHEMA)],
  '15:00': [LIST('fa_push', 'Closing Push FA', [SUB('fa_id', 'FA'), T('target_closing', 'Target Closing'), T('support', 'Bentuk Support')], 'Tambah FA', RESULT_SCHEMA)],
  '16:00': [LIST('fa_cek', 'Cek Disiplin per FA', [SUB('fa_id', 'FA'), TA('catatan_disiplin', 'Catatan Disiplin CRM')], 'Tambah FA', RESULT_SCHEMA)],
  '17:00': [T('topik_clinic', 'Topik Sales Clinic'), TA('poin_reinforcement', 'Poin Reinforcement'), LIST('fa_peserta', 'FA Peserta', [SUB('fa_id', 'FA'), T('catatan', 'Catatan')], 'Tambah FA', RESULT_SCHEMA)],
  '18:00': [TA('pencapaian_tim', 'Pencapaian Tim'), TA('arah_besok', 'Arah Besok'), LIST('fa_accountability', 'Akuntabilitas FA', [SUB('fa_id', 'FA'), T('hasil', 'Hasil')], 'Tambah FA', RESULT_SCHEMA)],
};

const BM_FORMS = {
  '07:30': [TA('arah_bisnis', 'Arah Bisnis'), T('kpi_focus', 'KPI Focus'), LIST('fwss_alignment', 'Alignment per FWSS', [SUB('fwss_id', 'FWSS'), T('catatan', 'Catatan Alignment')], 'Tambah FWSS', RESULT_SCHEMA)],
  '08:00': [LIST('fwss_pipeline', 'Monitoring Pipeline FWSS', [SUB('fwss_id', 'FWSS'), T('pipeline_key', 'Pipeline Kunci'), T('support_needed', 'Support Dibutuhkan')], 'Tambah FWSS', RESULT_SCHEMA)],
  '09:00': [LIST('fwss_support', 'Support per FWSS', [SUB('fwss_id', 'FWSS'), TA('bentuk_support', 'Bentuk Support')], 'Tambah FWSS', RESULT_SCHEMA)],
  '10:00': [LIST('opportunities', 'Daftar Opportunity', [TA('opportunity', 'Business Opportunity'), T('koordinasi_dengan', 'Koordinasi Dengan'), TA('tindak_lanjut', 'Tindak Lanjut')], 'Tambah Opportunity', RESULT_SCHEMA)],
  '11:00': [LIST('hpc_cases', 'Support HPC per FWSS', [SUB('fwss_id', 'FWSS'), T('nama_nasabah', 'Nama Nasabah'), T('produk', 'Produk'), TA('bentuk_support', 'Bentuk Support')], 'Tambah FWSS', RESULT_SCHEMA)],
  '12:00': [T('topik_reinforcement', 'Topik Reinforcement'), TA('pesan_utama', 'Pesan Utama'), LIST('target_fwss', 'Target FWSS', [SUB('fwss_id', 'FWSS'), T('catatan', 'Catatan')], 'Tambah FWSS', RESULT_SCHEMA)],
  '13:00': [LIST('fwss_joint', 'Joint Meeting per FWSS', [SUB('fwss_id', 'FWSS'), T('nama_nasabah', 'Nama Nasabah'), TA('support_closing', 'Support Closing')], 'Tambah FWSS', RESULT_SCHEMA)],
  '14:00': [TA('monitoring_summary', 'Ringkasan Monitoring'), LIST('fwss_recovery', 'Recovery FWSS', [SUB('fwss_id', 'FWSS'), T('gap', 'Gap'), T('support', 'Support')], 'Tambah FWSS', RESULT_SCHEMA)],
  '15:00': [LIST('eskalasi', 'Eskalasi per FWSS', [SUB('fwss_id', 'FWSS'), TA('kasus_eskalasi', 'Kasus Eskalasi'), TA('tindakan', 'Tindakan')], 'Tambah FWSS', RESULT_SCHEMA)],
  '16:00': [LIST('validasi_fwss', 'Validasi per FWSS', [SUB('fwss_id', 'FWSS'), TA('temuan', 'Temuan')], 'Tambah FWSS', RESULT_SCHEMA)],
  '17:00': [T('topik_review', 'Topik Review'), TA('poin_utama', 'Poin Utama'), LIST('peserta', 'Peserta FWSS', [SUB('fwss_id', 'FWSS'), T('catatan', 'Catatan')], 'Tambah FWSS', RESULT_SCHEMA)],
  '18:00': [TA('pencapaian_hari', 'Pencapaian Hari Ini'), T('gap_target', 'Gap Target'), TA('planning_besok', 'Planning Besok'), LIST('fwss_accountability', 'Akuntabilitas FWSS', [SUB('fwss_id', 'FWSS'), T('hasil', 'Hasil')], 'Tambah FWSS', RESULT_SCHEMA)],
};

function formsForRole(role) {
  switch (role) {
    case 'FWSS':
      return FWSS_FORMS;
    case 'BM':
      return BM_FORMS;
    case 'FA':
    default:
      return FA_FORMS;
  }
}

// Schema field untuk satu slot (role + jam). Kosong → fallback generik.
export function formSchemaFor(role, time) {
  return formsForRole(role)[time] || [];
}

// ── Helper penjadwalan per-hari (Senin–Jumat) ─────────────
import { WEEKDAYS, DEFAULT_DURATION } from '../lib/utils';

export function emptyDaySlots(role) {
  return slotsForRole(role).map((t) => ({
    time: t.time,
    endTime: t.endTime,
    label: t.label,
    duration: DEFAULT_DURATION,
    data: {}, // nilai field kontekstual sesuai formSchemaFor(role, time)
  }));
}

export function emptyPlanByDay(role) {
  const out = {};
  WEEKDAYS.forEach((w) => {
    out[w.key] = emptyDaySlots(role);
  });
  return out;
}

// Normalisasi slots dari DB ke struktur { monday:[...], ... }.
// Format lama (array) diabaikan agar mulai bersih.
export function normalizePlanByDay(slots, role) {
  const base = emptyPlanByDay(role);
  if (slots && !Array.isArray(slots) && typeof slots === 'object') {
    WEEKDAYS.forEach((w) => {
      const day = slots[w.key];
      if (Array.isArray(day)) {
        const byTime = new Map(day.map((s) => [s.time, s]));
        base[w.key] = base[w.key].map((t) => ({ ...t, ...(byTime.get(t.time) || {}) }));
      }
    });
  }
  return base;
}
