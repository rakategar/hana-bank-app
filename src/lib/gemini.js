import { rubricToText } from '../constants/scoringRubric';
import { ROLE_LABELS, serializeStructuredData } from './utils';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = 'gemini-3.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export const isGeminiConfigured = Boolean(GEMINI_KEY);

class GeminiError extends Error {}

async function callGemini(prompt, { temperature = 0.3 } = {}) {
  if (!GEMINI_KEY) {
    throw new GeminiError(
      'VITE_GEMINI_API_KEY belum diset. Tambahkan di file .env untuk mengaktifkan penilaian AI.'
    );
  }

  const res = await fetch(`${ENDPOINT}?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new GeminiError(`Gemini API error (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new GeminiError('Respons Gemini kosong / tidak valid.');

  return parseJson(raw);
}

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    // fallback: ambil blok JSON pertama
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* noop */
      }
    }
    throw new GeminiError('Gagal memparse JSON dari respons Gemini.');
  }
}

// ── 1. SCORING aktivitas harian ───────────────────────────

export async function scoreDailyActivities({ role, activities, usersById = null }) {
  const roleLabel = ROLE_LABELS[role] || role;
  const rubric = rubricToText(role);
  const activitiesJSON = JSON.stringify(
    activities.map((a) => ({
      time: a.time,
      label: a.label,
      // planned & actual berisi data form terstruktur (di-serialize jadi teks ringkas).
      // Fallback ke string lama bila slot belum memakai schema kontekstual.
      planned: serializeStructuredData(a.planned_data, usersById) || a.planned || '',
      actual: serializeStructuredData(a.actual_data, usersById) || a.actual || '',
      status: a.activity_status || 'not_done',
      notes: a.notes || '',
    })),
    null,
    2
  );

  const prompt = `Kamu adalah evaluator performa ICU Class Bank Hana. Role user: ${roleLabel} (${role}).

Rubrik scoring per aktivitas:

${rubric}

Evaluasi aktivitas berikut secara objektif berdasarkan rubrik. Tiap aktivitas punya "planned" (rencana terstruktur yang disusun user sebelumnya) dan "actual" (eksekusi nyata). Bandingkan keduanya: semakin kecil gap antara rencana dan realisasi, semakin tinggi skor. Jika "actual" kosong atau "status" not_done, beri score rendah (1). Output HANYA JSON valid dengan struktur:
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

  return callGemini(prompt, { temperature: 0.3 });
}

// ── 2. SUMMARY FWSS untuk FA ──────────────────────────────

export async function summarizeForFwss({ faData }) {
  const dataText = faData
    .map(
      (fa, i) =>
        `Data FA ${i + 1} (${fa.id} - ${fa.name}):\n` +
        `- Weekly plan: ${JSON.stringify(fa.weeklyPlan || 'belum ada')}\n` +
        `- Aktivitas hari ini: ${JSON.stringify(fa.activities || 'belum ada')}\n` +
        `- AI scores: ${JSON.stringify(fa.score || 'belum dinilai')}`
    )
    .join('\n\n');

  const prompt = `Kamu adalah asisten manajerial FWSS Bank Hana dalam program ICU Class.
Buat ringkasan kinerja FA berikut dalam Bahasa Indonesia.

${dataText}

Output HANYA JSON valid:
{
  "fa_summaries": [{
    "fa_id": "",
    "fa_name": "",
    "performance_status": "critical|recovery|on_track|high_impact",
    "summary": "max 150 kata",
    "highlights": ["max 3 poin positif"],
    "risks": ["max 3 poin risiko"],
    "fwss_recommendations": ["max 3 tindakan konkret untuk FWSS"]
  }],
  "team_overall": "ringkasan 2 FA dalam 1 paragraf",
  "urgent_actions": ["tindakan mendesak jika ada"]
}`;

  return callGemini(prompt, { temperature: 0.4 });
}

// ── 3. SUMMARY BM untuk tim ───────────────────────────────

export async function summarizeForBm({ fwssData }) {
  const dataText = fwssData
    .map(
      (f, i) =>
        `Data FWSS ${i + 1} (${f.id} - ${f.name}):\n` +
        `- Aktivitas & score sendiri: ${JSON.stringify(f.score || 'belum dinilai')}\n` +
        `- Summary FWSS untuk FA: ${JSON.stringify(f.faSummary || 'belum ada')}\n` +
        `- FA di bawahnya: ${JSON.stringify(f.faScores || [])}`
    )
    .join('\n\n');

  const prompt = `Kamu adalah asisten manajerial Branch Manager Bank Hana dalam program ICU Class.
Buat executive summary kinerja 2 FWSS beserta FA mereka dalam Bahasa Indonesia.

${dataText}

Output HANYA JSON valid:
{
  "fwss_summaries": [{
    "fwss_id": "",
    "fwss_name": "",
    "performance_status": "critical|recovery|on_track|high_impact",
    "summary": "max 150 kata",
    "highlights": ["max 3 poin positif"],
    "risks": ["max 3 poin risiko"],
    "bm_recommendations": ["max 3 tindakan strategis untuk BM"]
  }],
  "team_overall": "ringkasan tim cabang dalam 1 paragraf",
  "urgent_actions": ["tindakan mendesak jika ada"]
}`;

  return callGemini(prompt, { temperature: 0.4 });
}

// ── 4. SUMMARY RH keseluruhan ─────────────────────────────

export async function summarizeForRh({ allData }) {
  const prompt = `Kamu adalah asisten eksekutif Regional Head Bank Hana dalam program ICU Class.
Buat executive summary kinerja seluruh tim hari ini dalam Bahasa Indonesia.

Data seluruh tim:
${JSON.stringify(allData, null, 2)}

Output HANYA JSON valid:
{
  "executive_summary": "max 200 kata, high-level, bahasa eksekutif",
  "team_overall_status": "critical|recovery|on_track|high_impact",
  "performance_ranking": [
    {"rank": 1, "user_id": "", "name": "", "role": "", "score": 0, "level": ""}
  ],
  "risk_flags": [
    {"user_id": "", "name": "", "issue": "", "urgency": "high|medium|low"}
  ],
  "strategic_recommendations": ["max 3 rekomendasi strategis"],
  "requires_warning_letter": ["user_id list yang disarankan dapat surat peringatan"]
}`;

  return callGemini(prompt, { temperature: 0.4 });
}
