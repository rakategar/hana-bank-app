import { rubricToText } from '../constants/scoringRubric';
import { ROLE_LABELS, serializeStructuredData } from './utils';

// Penilaian & ringkasan AI memakai Claude (Sonnet 4.6) lewat proxy serverless /api/ai.
// API key Anthropic disimpan SERVER-SIDE (tidak pernah masuk bundle browser).
// VITE_AI_ENABLED hanya untuk banner UI; key sebenarnya tetap di server.
export const isAiConfigured = (import.meta.env.VITE_AI_ENABLED ?? 'true') !== 'false';

const SYSTEM = 'Kamu evaluator & analis untuk program ICU Class Bank Hana. Keluarkan HANYA JSON valid sesuai struktur yang diminta — tanpa teks pembuka/penutup, tanpa markdown, tanpa code fence.';

// Hybrid: scoring harian (volume tinggi) pakai Haiku; summary manajerial pakai Sonnet.
const SCORING_MODEL = 'claude-haiku-4-5';
const SUMMARY_MODEL = 'claude-sonnet-4-6';

class AiError extends Error {}

async function callClaude(prompt, { model = SUMMARY_MODEL, temperature = 0.3, maxTokens = 2048 } = {}) {
  let res;
  try {
    res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: SYSTEM, user: prompt, model, temperature, max_tokens: maxTokens }),
    });
  } catch {
    throw new AiError('Gagal menghubungi layanan AI. Periksa koneksi internet.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AiError(data?.error || `Layanan AI error (${res.status}).`);
  }
  if (!data?.text) throw new AiError('Respons AI kosong / tidak valid.');
  return parseJson(data.text);
}

function parseJson(raw) {
  // Strip code fence jika ada (```json ... ``` atau ``` ... ```)
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // fallback: ambil blok { ... } terluar
    const match = stripped.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* noop */
      }
    }
    throw new AiError('Gagal memparse JSON dari respons AI.');
  }
}

// ── 1. SCORING aktivitas harian ───────────────────────────

export async function scoreDailyActivities({ role, activities, usersById = null }) {
  const roleLabel = ROLE_LABELS[role] || role;
  const rubric = rubricToText(role);
  const noWeeklyPlan = role === 'FWSS' || role === 'BM';

  const activitiesJSON = JSON.stringify(
    activities.map((a) => {
      const actual = serializeStructuredData(a.actual_data, usersById) || a.actual || '';
      const base = {
        time: a.time,
        label: a.label,
        actual,
        status: a.activity_status || 'not_done',
        notes: a.notes || '',
      };
      if (!noWeeklyPlan) {
        base.planned = serializeStructuredData(a.planned_data, usersById) || a.planned || '';
      }
      return base;
    }),
    null,
    2
  );

  const scoringInstruction = noWeeklyPlan
    ? `Tidak ada rencana mingguan sebagai acuan untuk role ini. Nilai kualitas eksekusi berdasarkan: (1) status penyelesaian (done/partial/not_done), (2) kedalaman dan intensitas aktivitas yang diisi pada field "actual", (3) kesesuaian dengan rubrik peran. Jika "actual" kosong atau "status" not_done, beri score rendah (1).`
    : `Tiap aktivitas punya "planned" (rencana terstruktur yang disusun user sebelumnya) dan "actual" (eksekusi nyata). Bandingkan keduanya: semakin kecil gap antara rencana dan realisasi, semakin tinggi skor. Jika "actual" kosong atau "status" not_done, beri score rendah (1).`;

  const prompt = `Kamu adalah evaluator performa ICU Class Bank Hana. Role user: ${roleLabel} (${role}).

Rubrik scoring per aktivitas:

${rubric}

Evaluasi aktivitas berikut secara objektif berdasarkan rubrik. ${scoringInstruction} Output HANYA JSON valid dengan struktur:
{
  "scores": [{
    "time": "07:30",
    "label": "Morning Briefing & Target Commitment",
    "score": 1,
    "level": "CRITICAL|RECOVERY|ON TRACK|HIGH IMPACT",
    "reasoning": "alasan singkat bahasa Indonesia max 50 kata",
    "recommendation": "saran konkret bahasa Indonesia max 50 kata"
  }],
  "daily_average": 0.0,
  "daily_level": "CRITICAL|RECOVERY|ON TRACK|HIGH IMPACT",
  "summary": "ringkasan performa hari ini max 100 kata",
  "overall_recommendation": "saran utama untuk besok max 50 kata"
}

level mapping: score 1=CRITICAL, 2=RECOVERY, 3=ON TRACK, 4=HIGH IMPACT.

Aktivitas yang dievaluasi:
${activitiesJSON}`;

  return callClaude(prompt, { model: SCORING_MODEL, temperature: 0.3, maxTokens: 4096 });
}

// ── 2. SUMMARY FWSS untuk FA ──────────────────────────────

export async function summarizeForFwss({ faData }) {
  const dataText = faData
    .map(
      (fa, i) =>
        `Data Anggota ${i + 1} (id=${fa.id}, nama=${fa.name}, role=${fa.role || 'FA'}):\n` +
        `- Weekly plan: ${JSON.stringify(fa.weeklyPlan || 'belum ada')}\n` +
        `- Aktivitas hari ini: ${JSON.stringify(fa.activities || 'belum ada')}\n` +
        `- AI scores (daily_level = level resmi): ${JSON.stringify(fa.score || 'belum dinilai')}`
    )
    .join('\n\n');

  const prompt = `Kamu adalah asisten manajerial ICU Class Bank Hana.
Buat ringkasan kinerja anggota tim yang dipilih berikut dalam Bahasa Indonesia.

ATURAN AKURASI (WAJIB):
- Pakai "fa_id" & "fa_name" PERSIS dari data (jangan mengubah/mengarang nama atau id).
- "performance_status" HARUS sama dengan daily_level dari AI scores bila ada
  (CRITICAL→critical, RECOVERY→recovery, ON TRACK→on_track, HIGH IMPACT→high_impact).
- Jika AI scores "belum dinilai" / aktivitas belum diisi: set performance_status "critical",
  summary cukup "Belum mengisi aktivitas hari ini", dan KOSONGKAN highlights (jangan mengarang prestasi).
- Setiap anggota memiliki field "role" (FA, BM, dll) — sesuaikan konteks rekomendasi dengan rolenya.

Data Anggota Tim:
${dataText}

Output HANYA JSON valid:
{
  "fa_summaries": [{
    "fa_id": "",
    "fa_name": "",
    "performance_status": "critical|recovery|on_track|high_impact",
    "summary": "max 150 kata",
    "highlights": ["max 3 poin positif (kosong bila belum ada data)"],
    "risks": ["max 3 poin risiko"],
    "fwss_recommendations": ["max 3 tindakan konkret sesuai role anggota"]
  }],
  "team_overall": "ringkasan seluruh anggota dalam 1 paragraf",
  "urgent_actions": ["tindakan mendesak jika ada"]
}`;

  return callClaude(prompt, { model: SUMMARY_MODEL, temperature: 0.4, maxTokens: 8192 });
}

// ── 3. SUMMARY BM untuk tim ───────────────────────────────

export async function summarizeForBm({ fwssData }) {
  const dataText = fwssData
    .map(
      (f, i) =>
        `Data Anggota ${i + 1} (id=${f.id}, nama=${f.name}, role=${f.role || 'FWSS'}):\n` +
        `- Aktivitas & score sendiri (daily_level = level resmi): ${JSON.stringify(f.score || 'belum dinilai')}\n` +
        `- Summary tim di bawahnya: ${JSON.stringify(f.faSummary || 'belum ada')}\n` +
        `- Anggota tim di bawahnya: ${JSON.stringify(f.faScores?.length ? f.faScores : 'tidak ada / tidak berlaku')}`
    )
    .join('\n\n');

  const prompt = `Kamu adalah asisten manajerial ICU Class Bank Hana.
Buat executive summary kinerja anggota tim yang dipilih beserta data FA mereka dalam Bahasa Indonesia.

ATURAN AKURASI (WAJIB):
- Pakai "fwss_id" & "fwss_name" PERSIS dari data.
- "performance_status" HARUS sama dengan daily_level dari score sendiri bila ada
  (CRITICAL→critical, RECOVERY→recovery, ON TRACK→on_track, HIGH IMPACT→high_impact).
- Jika "belum dinilai": set performance_status "critical", summary "Belum mengisi aktivitas hari ini",
  dan KOSONGKAN highlights (jangan mengarang prestasi/angka).
- Setiap anggota memiliki field "role" (FA, FWSS, dll) — sesuaikan konteks rekomendasi dengan rolenya.
  Untuk FA: "anggota tim di bawahnya" tidak berlaku, fokus pada performa individualnya.

Data Anggota Tim:
${dataText}

Output HANYA JSON valid:
{
  "fwss_summaries": [{
    "fwss_id": "",
    "fwss_name": "",
    "performance_status": "critical|recovery|on_track|high_impact",
    "summary": "max 150 kata",
    "highlights": ["max 3 poin positif (kosong bila belum ada data)"],
    "risks": ["max 3 poin risiko"],
    "bm_recommendations": ["max 3 tindakan strategis untuk BM"]
  }],
  "team_overall": "ringkasan seluruh tim cabang dalam 1 paragraf",
  "urgent_actions": ["tindakan mendesak jika ada"]
}`;

  return callClaude(prompt, { model: SUMMARY_MODEL, temperature: 0.4, maxTokens: 8192 });
}

// ── 4. SUMMARY RH keseluruhan ─────────────────────────────

export async function summarizeForRh({ allData }) {
  const dateRange = allData.date_range || 'hari ini';
  const isRange = allData.date_range && allData.date_range.includes('–');

  // Hapus stats.ranking dari facts — sudah ada di ranking, jangan duplikat payload
  const { ranking: _dropped, ...statsWithoutRanking } = allData.stats || {};
  const facts = {
    periode: dateRange,
    ranking: allData.ranking || [],
    stats: statsWithoutRanking,
    // team berisi skor rata-rata per individu selama periode + info kehadiran data
    team: (allData.team || []).map((u) => ({
      user_id: u.user_id,
      name: u.name,
      role: u.role,
      branch: u.branch || null,
      rata_rata_skor: u.daily_average,
      level: u.daily_level || null,
      hari_ada_data: u.scored_days ?? null,
      total_hari_kerja: u.total_days ?? null,
      // Batasi 400 karakter agar prompt tidak membengkak untuk range multi-hari
      ringkasan_gabungan: u.summary ? u.summary.slice(0, 400) : null,
    })),
    bm_summary: allData.bm_summary || null,
  };

  const periodeLabel = isRange
    ? `periode ${dateRange}`
    : `hari ${dateRange}`;

  const prompt = `Kamu adalah asisten eksekutif Regional Head Bank Hana dalam program ICU Class.
Buat executive summary kinerja seluruh tim untuk ${periodeLabel} dalam Bahasa Indonesia eksekutif.

ATURAN AKURASI (WAJIB, jangan dilanggar):
- Gunakan angka HANYA dari blok FAKTA di bawah. JANGAN menghitung ulang atau mengarang skor.
- "performance_ranking" SALIN PERSIS dari FAKTA.ranking (rank, user_id, name, role, score, level apa adanya).
- Skor yang tersedia adalah RATA-RATA seluruh hari kerja dalam periode (bukan satu hari).
- "hari_ada_data" = berapa hari user tersebut memiliki data dalam periode. Sebutkan ini jika ada ketidakhadiran data.
- User dengan rata_rata_skor null BELUM mengisi aktivitas sama sekali selama periode: sebut
  "belum ada data", JANGAN memberi skor atau menilai performanya seolah ada angka.
- "requires_warning_letter" HANYA boleh berisi user_id yang di FAKTA.ranking ber-level
  CRITICAL atau RECOVERY (dan has_score=true). Jika tidak ada, kembalikan array kosong.
- "risk_flags" HANYA untuk user_id/nama yang ADA di FAKTA. Jangan menambah orang lain.
- "team_overall_status" cerminkan rata-rata tim (FAKTA.stats.average) & distribusi level.
- "executive_summary" wajib menyebut periode (${dateRange}), FAKTA.stats.average, distribusi level,
  dan jumlah hari tanpa data jika ada.

FAKTA (otoritatif):
${JSON.stringify(facts, null, 2)}

Output HANYA JSON valid:
{
  "executive_summary": "max 250 kata, high-level, mengacu FAKTA termasuk periode",
  "team_overall_status": "critical|recovery|on_track|high_impact",
  "performance_ranking": [
    {"rank": 1, "user_id": "", "name": "", "role": "", "score": 0, "level": ""}
  ],
  "risk_flags": [
    {"user_id": "", "name": "", "issue": "", "urgency": "high|medium|low"}
  ],
  "strategic_recommendations": ["max 3 rekomendasi strategis konkret untuk periode ini"],
  "requires_warning_letter": ["user_id (hanya level CRITICAL/RECOVERY dari FAKTA)"]
}`;

  return callClaude(prompt, { model: SUMMARY_MODEL, temperature: 0.3, maxTokens: 8192 });
}
