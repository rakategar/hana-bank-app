// Rubrik scoring ICU Class Bank Hana — per role, per slot, 4 level.
// Level 1 CRITICAL · 2 RECOVERY · 3 ON TRACK · 4 HIGH IMPACT

export const FA_RUBRIC = {
  '07:30': {
    label: 'Morning Briefing & Target Commitment',
    criteria: {
      1: 'Tidak memiliki target & action plan',
      2: 'Target ada, action plan belum lengkap',
      3: 'Target, pipeline & action plan harian jelas',
      4: 'Target sangat jelas, urgency execution tinggi',
    },
  },
  '08:00': {
    label: 'Pipeline Review & Prioritas Nasabah',
    criteria: {
      1: 'Pipeline tidak direview, prioritas tidak jelas',
      2: 'Pipeline direview sebagian, prioritas kabur',
      3: 'Pipeline lengkap, prospek prioritas teridentifikasi',
      4: 'Pipeline tajam, next action konkret tiap prospek',
    },
  },
  '09:00': {
    label: 'Tele-Appointment & Customer Engagement',
    criteria: {
      1: 'Tidak ada engagement/telepon dilakukan',
      2: 'Engagement minim, tidak ada appointment',
      3: 'Engagement aktif, beberapa appointment terjadwal',
      4: 'Engagement tinggi, banyak appointment berkualitas',
    },
  },
  '10:00': {
    label: 'Prospecting & Referral Sourcing',
    criteria: {
      1: 'Tidak ada prospecting/lead baru',
      2: 'Sedikit lead, kualitas rendah',
      3: 'Lead baru cukup, ada yang potensial',
      4: 'Banyak lead berkualitas dari referral kuat',
    },
  },
  '11:00': {
    label: 'Customer Meeting & Product Presentation',
    criteria: {
      1: 'Tidak ada meeting/presentasi',
      2: 'Meeting terjadi tapi presentasi lemah',
      3: 'Meeting berjalan, presentasi produk solid',
      4: 'Meeting impactful, nasabah sangat tertarik',
    },
  },
  '12:00': {
    label: 'Persiapan Meeting & Kelengkapan Aplikasi',
    criteria: {
      1: 'Aplikasi/dokumen tidak disiapkan',
      2: 'Persiapan sebagian, dokumen kurang',
      3: 'Persiapan lengkap untuk meeting berikutnya',
      4: 'Persiapan matang, aplikasi siap submit',
    },
  },
  '13:00': {
    label: 'Midday Checkpoint & Recovery Action',
    criteria: {
      1: 'Tidak ada checkpoint/recovery',
      2: 'Checkpoint dilakukan, recovery belum jelas',
      3: 'Checkpoint + recovery action terlaksana',
      4: 'Recovery agresif, slot tertinggal dikejar',
    },
  },
  '14:00': {
    label: 'Customer Meeting & Advisory Session',
    criteria: {
      1: 'Tidak ada sesi advisory',
      2: 'Advisory dangkal, nilai tambah minim',
      3: 'Advisory baik, kebutuhan nasabah terpetakan',
      4: 'Advisory unggul, nasabah commit ke produk',
    },
  },
  '15:00': {
    label: 'Closing Follow Up & Objection Handling',
    criteria: {
      1: 'Tidak ada follow up closing',
      2: 'Follow up minim, objection tak tertangani',
      3: 'Follow up aktif, objection ditangani baik',
      4: 'Closing kuat, deal terkonfirmasi',
    },
  },
  '16:00': {
    label: 'Update CRM & Submit Activity',
    criteria: {
      1: 'CRM tidak diupdate',
      2: 'CRM diupdate sebagian',
      3: 'CRM diupdate lengkap & rapi',
      4: 'CRM 100% akurat, aktivitas terdokumentasi penuh',
    },
  },
  '17:00': {
    label: 'Sales Coaching & Skill Practice',
    criteria: {
      1: 'Tidak ikut coaching/latihan',
      2: 'Ikut coaching pasif',
      3: 'Coaching aktif, action plan tersusun',
      4: 'Coaching produktif, skill diterapkan langsung',
    },
  },
  '18:00': {
    label: 'Evening Review & Pipeline Lock Besok',
    criteria: {
      1: 'Tidak ada review & pipeline besok',
      2: 'Review singkat, pipeline besok belum jelas',
      3: 'Review lengkap, pipeline besok terkunci',
      4: 'Review tajam, target besok jelas & terkunci',
    },
  },
};

export const FWSS_RUBRIC = {
  '07:30': { label: 'Daily Recovery Direction & Target Lock', criteria: { 1: 'Tidak ada arahan/target untuk tim', 2: 'Arahan ada, target belum dikunci', 3: 'Arahan jelas, target tim terkunci', 4: 'Arahan tajam, recovery direction kuat' } },
  '08:00': { label: 'Pipeline Control & FA Monitoring', criteria: { 1: 'Tidak memonitor pipeline FA', 2: 'Monitoring sebagian FA', 3: 'Pipeline semua FA terkontrol', 4: 'Kontrol ketat, intervensi tepat sasaran' } },
  '09:00': { label: 'Morning Activation & Sales Recovery', criteria: { 1: 'Tidak ada aktivasi pagi', 2: 'Aktivasi lemah', 3: 'Aktivasi efektif, FA bergerak', 4: 'Aktivasi kuat, recovery signifikan' } },
  '10:00': { label: 'Branch Opportunity & Lead Activation', criteria: { 1: 'Tidak menggali peluang cabang', 2: 'Peluang dilihat, belum diaktivasi', 3: 'Peluang cabang diaktivasi', 4: 'Banyak lead cabang teraktivasi' } },
  '11:00': { label: 'Case Review & Solution Discussion', criteria: { 1: 'Tidak ada review case', 2: 'Review dangkal', 3: 'Case direview, solusi disepakati', 4: 'Solusi tajam, case terselesaikan' } },
  '12:00': { label: 'Recovery Coaching & Result Enforcement', criteria: { 1: 'Tidak ada coaching recovery', 2: 'Coaching pasif', 3: 'Coaching efektif, hasil ditekankan', 4: 'Coaching kuat, akuntabilitas tinggi' } },
  '13:00': { label: 'Joint Meeting & Assisted Closing', criteria: { 1: 'Tidak ada joint meeting', 2: 'Joint meeting tanpa hasil', 3: 'Joint meeting, assisted closing berjalan', 4: 'Assisted closing sukses, deal terbantu' } },
  '14:00': { label: 'Midday Monitoring & Recovery Intervention', criteria: { 1: 'Tidak ada monitoring siang', 2: 'Monitoring tanpa intervensi', 3: 'Monitoring + intervensi recovery', 4: 'Intervensi agresif, gap tertutup' } },
  '15:00': { label: 'Closing Push & Conversion Acceleration', criteria: { 1: 'Tidak mendorong closing', 2: 'Dorongan closing lemah', 3: 'Closing push efektif', 4: 'Akselerasi konversi signifikan' } },
  '16:00': { label: 'CRM Monitoring & Activity Discipline', criteria: { 1: 'CRM tim tidak dimonitor', 2: 'Monitoring CRM sebagian', 3: 'CRM tim disiplin & terpantau', 4: 'Disiplin CRM tinggi, data akurat' } },
  '17:00': { label: 'Sales Clinic & Recovery Reinforcement', criteria: { 1: 'Tidak ada sales clinic', 2: 'Clinic pasif', 3: 'Clinic efektif, skill diperkuat', 4: 'Clinic kuat, recovery mindset terbentuk' } },
  '18:00': { label: 'End Day Accountability & Direction', criteria: { 1: 'Tidak ada akuntabilitas akhir hari', 2: 'Review akhir hari minim', 3: 'Akuntabilitas jelas, arah besok ada', 4: 'Akuntabilitas tegas, direction tajam' } },
};

export const BM_RUBRIC = {
  '07:30': { label: 'Business Direction & Daily Alignment', criteria: { 1: 'Tidak ada arah bisnis harian', 2: 'Arah ada, alignment lemah', 3: 'Arah bisnis & alignment jelas', 4: 'Arah strategis, tim selaras penuh' } },
  '08:00': { label: 'Pipeline Monitoring & Priority Support', criteria: { 1: 'Tidak memonitor pipeline tim', 2: 'Monitoring sebagian', 3: 'Pipeline dimonitor, prioritas didukung', 4: 'Dukungan prioritas tepat & berdampak' } },
  '09:00': { label: 'Morning Support & Team Reinforcement', criteria: { 1: 'Tidak ada dukungan pagi', 2: 'Dukungan minim', 3: 'Dukungan tim efektif', 4: 'Reinforcement kuat, tim termotivasi' } },
  '10:00': { label: 'Branch Coordination & Business Opportunity', criteria: { 1: 'Tidak ada koordinasi cabang', 2: 'Koordinasi lemah', 3: 'Koordinasi baik, peluang dikejar', 4: 'Peluang bisnis besar tergarap' } },
  '11:00': { label: 'Support High Potential Customer Case', criteria: { 1: 'Tidak mendukung case potensial', 2: 'Dukungan minim', 3: 'Case high-potential didukung', 4: 'Case besar terdorong ke closing' } },
  '12:00': { label: 'Business Reinforcement & Team Support', criteria: { 1: 'Tidak ada reinforcement', 2: 'Reinforcement lemah', 3: 'Reinforcement bisnis efektif', 4: 'Dukungan penuh, momentum terjaga' } },
  '13:00': { label: 'Joint Meeting & Closing Support', criteria: { 1: 'Tidak ada joint meeting', 2: 'Joint meeting tanpa dampak', 3: 'Closing support berjalan', 4: 'Closing terbantu signifikan' } },
  '14:00': { label: 'Midday Monitoring & Recovery Support', criteria: { 1: 'Tidak ada monitoring siang', 2: 'Monitoring tanpa tindak lanjut', 3: 'Recovery support diberikan', 4: 'Support tepat, gap tertutup' } },
  '15:00': { label: 'Escalation Support & Closing Assistance', criteria: { 1: 'Tidak menangani eskalasi', 2: 'Eskalasi lambat ditangani', 3: 'Eskalasi & closing dibantu', 4: 'Eskalasi cepat, closing sukses' } },
  '16:00': { label: 'CRM Monitoring & Activity Validation', criteria: { 1: 'Tidak memvalidasi CRM tim', 2: 'Validasi sebagian', 3: 'CRM tervalidasi & terpantau', 4: 'Validasi ketat, data akurat penuh' } },
  '17:00': { label: 'Business Review & Team Reinforcement', criteria: { 1: 'Tidak ada review bisnis', 2: 'Review dangkal', 3: 'Review bisnis solid', 4: 'Review strategis, arah jelas' } },
  '18:00': { label: 'End Day Review & Planning Besok', criteria: { 1: 'Tidak ada review & planning', 2: 'Planning besok belum jelas', 3: 'Review + planning besok jelas', 4: 'Planning tajam, prioritas terkunci' } },
};

export function rubricForRole(role) {
  switch (role) {
    case 'FWSS':
      return FWSS_RUBRIC;
    case 'BM':
      return BM_RUBRIC;
    case 'FA':
    default:
      return FA_RUBRIC;
  }
}

// String rubrik untuk disisipkan ke prompt Gemini
export function rubricToText(role) {
  const rubric = rubricForRole(role);
  return Object.entries(rubric)
    .map(([time, { label, criteria }]) => {
      const lines = [1, 2, 3, 4].map((s) => `  - Score ${s}: ${criteria[s]}`).join('\n');
      return `${time} ${label}:\n${lines}`;
    })
    .join('\n\n');
}
