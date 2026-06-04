import { serializeStructuredData, formatDateID, ROLE_LABELS, levelFromAverage, levelInfo } from './utils';

// Library export berat (jspdf/pptxgenjs) di-load dinamis agar tidak membebani bundle awal.

const STATUS_ID = { done: 'Selesai', partial: 'Sebagian', not_done: 'Tidak Selesai' };
const TEAL = '026B58';
const INK = '1F2933';

// ── Statistik tim deterministik (sumber kebenaran untuk UI, prompt AI, & PPT) ──
// Input team: [{ user_id, name, role, branch, daily_average, daily_level, summary }]
export function buildTeamStats(team = []) {
  const ranking = [...team]
    .sort((a, b) => {
      const av = a.daily_average ?? -1;
      const bv = b.daily_average ?? -1;
      return bv - av; // desc; null (-1) paling bawah
    })
    .map((u, i) => {
      const hasScore = u.daily_average != null;
      const level = u.daily_level || (hasScore ? levelFromAverage(u.daily_average)?.label : null);
      return {
        rank: i + 1,
        user_id: u.user_id,
        name: u.name,
        role: u.role,
        branch: u.branch || null,
        score: hasScore ? Number(u.daily_average) : null,
        level: level || null,
        has_score: hasScore,
      };
    });

  const counts = { CRITICAL: 0, RECOVERY: 0, 'ON TRACK': 0, 'HIGH IMPACT': 0 };
  let sum = 0;
  let scoredCount = 0;
  ranking.forEach((r) => {
    if (r.has_score) {
      sum += r.score;
      scoredCount += 1;
      const key = (r.level || '').toUpperCase();
      if (counts[key] != null) counts[key] += 1;
    }
  });

  return {
    ranking,
    average: scoredCount ? Number((sum / scoredCount).toFixed(2)) : null,
    counts,
    scoredCount,
    noData: ranking.length - scoredCount,
    total: ranking.length,
  };
}

// Daftar user_id yang layak dipertimbangkan surat peringatan (CRITICAL/RECOVERY).
export function lowPerformerIds(team = []) {
  return buildTeamStats(team)
    .ranking.filter((r) => r.has_score && ['CRITICAL', 'RECOVERY'].includes((r.level || '').toUpperCase()))
    .map((r) => r.user_id);
}

// ── PDF: laporan detail aktivitas satu user untuk tanggal terpilih ──
export async function exportUserDetailPDF({ user, date, activity, score }) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const activities = Array.isArray(activity?.activities) ? activity.activities : [];
  const scoreByTime = new Map((score?.scores || []).map((s) => [s.time, s]));

  // Header
  doc.setFontSize(16);
  doc.setTextColor(`#${TEAL}`);
  doc.text('Laporan Detail Aktivitas Harian', 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(`#${INK}`);
  doc.text(`${user.name} · ${ROLE_LABELS[user.role] || user.role}${user.branch ? ' · ' + user.branch : ''}`, 40, 58);
  doc.text(formatDateID(date), 40, 72);
  if (score?.daily_average != null) {
    doc.text(`Rata-rata skor: ${Number(score.daily_average).toFixed(2)} (${score.daily_level || '-'})`, 40, 86);
  }

  const body = activities.map((a) => {
    const sc = scoreByTime.get(a.time);
    return [
      a.endTime ? `${a.time}–${a.endTime}` : a.time,
      a.label || '',
      serializeStructuredData(a.planned_data) || a.planned || '-',
      serializeStructuredData(a.actual_data) || a.actual || '-',
      STATUS_ID[a.activity_status] || a.activity_status || '-',
      sc?.score != null ? String(sc.score) : '-',
      [a.notes, sc?.reasoning].filter(Boolean).join(' — ') || '-',
    ];
  });

  autoTable(doc, {
    startY: 100,
    head: [['Jam', 'Kegiatan', 'Rencana', 'Aktual', 'Status', 'Skor', 'Catatan / Alasan']],
    body: body.length ? body : [['-', 'Tidak ada aktivitas tercatat', '-', '-', '-', '-', '-']],
    styles: { fontSize: 7.5, cellPadding: 3, valign: 'top', overflow: 'linebreak' },
    headStyles: { fillColor: [2, 107, 88], textColor: 255, fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 120 },
      2: { cellWidth: 170 },
      3: { cellWidth: 170 },
      4: { cellWidth: 55 },
      5: { cellWidth: 35, halign: 'center' },
      6: { cellWidth: 130 },
    },
  });

  if (score?.summary) {
    const y = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.setTextColor(`#${TEAL}`);
    doc.text('Ringkasan AI', 40, y);
    doc.setFontSize(9);
    doc.setTextColor(`#${INK}`);
    doc.text(doc.splitTextToSize(score.summary, 760), 40, y + 14);
  }

  doc.save(`laporan-${user.name.replace(/\s+/g, '_')}-${date}.pdf`);
}

// Warna level (hex tanpa #) konsisten dengan dashboard.
const LEVEL_HEX = { CRITICAL: 'EF4444', RECOVERY: 'F97316', 'ON TRACK': '3B82F6', 'HIGH IMPACT': '22C55E' };
const URGENCY_HEX = { high: 'EF4444', medium: 'F97316', low: '3B82F6' };
const MUTED = '94A3B8';

function levelHex(lvl) {
  const info = levelInfo(lvl);
  return info ? LEVEL_HEX[info.label] || MUTED : MUTED;
}
function statusLabel(s) {
  return String(s || '').toUpperCase().replace(/_/g, ' ') || '—';
}

// Muat logo sebagai dataURL (di-skip bila gagal — laporan tetap dibuat).
async function loadLogoDataUrl() {
  try {
    const res = await fetch('/hana-bank-logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === 'string' ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── PPT: laporan ringkasan keseluruhan (RH) — berbranding & profesional ──
export async function exportOverallPPT({ rhName, date, team = [], result }) {
  const { default: pptxgen } = await import('pptxgenjs');
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  pptx.author = 'ICU Class Bank Hana';
  pptx.company = 'Bank Hana';

  const stats = buildTeamStats(team);
  const ranking = result?.performance_ranking?.length ? result.performance_ranking : stats.ranking;
  const summaryById = Object.fromEntries(team.map((u) => [u.user_id, u.summary]));
  const logo = await loadLogoDataUrl();

  // Slide master berbranding (header/footer/logo/nomor halaman)
  pptx.defineSlideMaster({
    title: 'HANA',
    background: { color: 'FFFFFF' },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: 0.16, fill: { color: TEAL } } },
      { rect: { x: 0, y: 7.34, w: '100%', h: 0.16, fill: { color: TEAL } } },
      { text: { text: `Rahasia · ICU Class Bank Hana · ${formatDateID(date)}`, options: { x: 0.4, y: 7.0, w: 10, h: 0.3, fontSize: 8, color: MUTED } } },
      ...(logo ? [{ image: { data: logo, x: 12.55, y: 0.28, w: 0.55, h: 0.42 } }] : []),
    ],
    slideNumber: { x: 12.7, y: 6.98, w: 0.5, h: 0.3, fontSize: 8, color: MUTED, align: 'right' },
  });

  const titleBar = (s, text, color = TEAL) =>
    s.addText(text, { x: 0.5, y: 0.42, w: 12.3, h: 0.6, fontSize: 26, bold: true, color });

  // ── Slide 1: Judul ──
  const s1 = pptx.addSlide();
  s1.background = { color: '0F2A24' };
  s1.addShape(pptx.ShapeType.rect, { x: 0, y: 2.7, w: 5.6, h: 0.08, fill: { color: '04B292' } });
  if (logo) s1.addImage({ data: logo, x: 0.6, y: 0.7, w: 1.0, h: 0.76 });
  s1.addText('Laporan Kinerja Regional', { x: 0.6, y: 1.9, w: 12, h: 0.9, fontSize: 40, bold: true, color: 'FFFFFF' });
  s1.addText('ICU Class — Intensive Control & Upgrading', { x: 0.6, y: 2.85, w: 12, h: 0.5, fontSize: 18, color: 'CDF0E9' });
  s1.addText(`${formatDateID(date)}${rhName ? '   •   ' + rhName : ''}`, { x: 0.62, y: 3.5, w: 12, h: 0.4, fontSize: 14, color: '94A3B8' });

  // ── Slide 2: Overview / KPI + grafik skor ──
  {
    const s = pptx.addSlide({ masterName: 'HANA' });
    titleBar(s, 'Ikhtisar Kinerja Tim');
    const kpis = [
      { label: 'Rata-rata Skor Tim', value: stats.average != null ? stats.average.toFixed(2) : '—', color: TEAL },
      { label: 'On Track / High Impact', value: String(stats.counts['ON TRACK'] + stats.counts['HIGH IMPACT']), color: '22C55E' },
      { label: 'Critical / Recovery', value: String(stats.counts.CRITICAL + stats.counts.RECOVERY), color: 'EF4444' },
      { label: 'Belum Mengisi', value: String(stats.noData), color: MUTED },
    ];
    const cardW = 2.95;
    const gap = 0.2;
    kpis.forEach((k, i) => {
      const x = 0.5 + i * (cardW + gap);
      s.addShape(pptx.ShapeType.roundRect, { x, y: 1.25, w: cardW, h: 1.35, rectRadius: 0.08, fill: { color: 'F4F6FA' }, line: { color: 'E2E8F0', width: 1 } });
      s.addText(k.value, { x, y: 1.4, w: cardW, h: 0.7, fontSize: 34, bold: true, color: k.color, align: 'center' });
      s.addText(k.label, { x, y: 2.12, w: cardW, h: 0.4, fontSize: 11, color: '475569', align: 'center' });
    });

    const scored = ranking.filter((r) => r.has_score !== false && r.score != null);
    if (scored.length) {
      s.addText('Skor per Individu', { x: 0.5, y: 2.95, w: 12, h: 0.4, fontSize: 14, bold: true, color: INK });
      s.addChart(
        pptx.ChartType.bar,
        [{ name: 'Skor', labels: scored.map((r) => r.name), values: scored.map((r) => Number(r.score)) }],
        {
          x: 0.5, y: 3.4, w: 12.3, h: 3.35,
          barDir: 'col', showValue: true, dataLabelFontSize: 11, dataLabelColor: INK,
          chartColors: scored.map((r) => levelHex(r.level)),
          showLegend: false, showTitle: false,
          valAxisMinVal: 0, valAxisMaxVal: 4, valAxisMajorUnit: 1,
          catAxisLabelFontSize: 10, valAxisLabelFontSize: 10,
        }
      );
    }
  }

  // ── Slide 3: Executive Summary ──
  if (result?.executive_summary) {
    const s = pptx.addSlide({ masterName: 'HANA' });
    titleBar(s, 'Executive Summary');
    if (result.team_overall_status) {
      s.addText(statusLabel(result.team_overall_status), {
        x: 0.5, y: 1.15, w: 3, h: 0.4, fontSize: 12, bold: true, align: 'center',
        color: 'FFFFFF', fill: { color: levelHex(result.team_overall_status) }, rectRadius: 0.1,
      });
    }
    s.addText(result.executive_summary, { x: 0.5, y: 1.8, w: 12.3, h: 4.8, fontSize: 15, color: INK, valign: 'top', lineSpacingMultiple: 1.2 });
  }

  // ── Slide 4: Ranking Performa (tabel berwarna) ──
  if (ranking.length) {
    const s = pptx.addSlide({ masterName: 'HANA' });
    titleBar(s, 'Ranking Performa');
    const head = ['#', 'Nama', 'Role', 'Cabang', 'Skor', 'Level'].map((t) => ({
      text: t, options: { bold: true, color: 'FFFFFF', fill: { color: TEAL }, align: 'left', valign: 'middle' },
    }));
    const medal = ['🥇', '🥈', '🥉'];
    const body = ranking.map((r, i) => {
      const rowFill = i % 2 === 0 ? 'FFFFFF' : 'F4F6FA';
      const base = { color: INK, fill: { color: rowFill }, valign: 'middle' };
      return [
        { text: `${medal[i] || ''} ${r.rank}`.trim(), options: base },
        { text: String(r.name ?? ''), options: { ...base, bold: true } },
        { text: String(r.role ?? ''), options: base },
        { text: String(r.branch ?? '-'), options: base },
        { text: r.score != null ? Number(r.score).toFixed(1) : '—', options: { ...base, align: 'center' } },
        { text: r.level ? statusLabel(r.level) : 'BELUM ADA DATA', options: { color: 'FFFFFF', bold: true, align: 'center', valign: 'middle', fill: { color: r.level ? levelHex(r.level) : MUTED } } },
      ];
    });
    s.addTable([head, ...body], {
      x: 0.5, y: 1.25, w: 12.3, colW: [1.1, 3.6, 1.6, 2.8, 1.2, 2.0],
      fontSize: 12, rowH: 0.42, border: { type: 'solid', color: 'E2E8F0', pt: 1 }, valign: 'middle',
    });
  }

  // ── Slide 5: Risk Flags ──
  if (result?.risk_flags?.length) {
    const s = pptx.addSlide({ masterName: 'HANA' });
    titleBar(s, 'Risk Flags', 'EF4444');
    let y = 1.3;
    result.risk_flags.slice(0, 8).forEach((r) => {
      const uc = URGENCY_HEX[r.urgency] || MUTED;
      s.addShape(pptx.ShapeType.roundRect, { x: 0.5, y, w: 12.3, h: 0.7, rectRadius: 0.06, fill: { color: 'F4F6FA' }, line: { color: 'E2E8F0', width: 1 } });
      s.addText(String(r.urgency || '-').toUpperCase(), { x: 0.65, y: y + 0.16, w: 1.4, h: 0.38, fontSize: 10, bold: true, align: 'center', color: 'FFFFFF', fill: { color: uc }, rectRadius: 0.1 });
      s.addText([{ text: `${r.name}: `, options: { bold: true, color: INK } }, { text: r.issue || '', options: { color: '475569' } }], { x: 2.2, y, w: 10.4, h: 0.7, fontSize: 12, valign: 'middle' });
      y += 0.82;
    });
  }

  // ── Slide 6: Rekomendasi Strategis ──
  if (result?.strategic_recommendations?.length) {
    const s = pptx.addSlide({ masterName: 'HANA' });
    titleBar(s, 'Rekomendasi Strategis');
    s.addText(
      result.strategic_recommendations.map((r, i) => ({
        text: `${i + 1}.  ${r}`,
        options: { color: INK, fontSize: 16, breakLine: true, paraSpaceAfter: 14 },
      })),
      { x: 0.7, y: 1.4, w: 12, h: 5, valign: 'top' }
    );
  }

  // ── Slide per individu (yang sudah ada skor) ──
  ranking.filter((r) => r.score != null).slice(0, 12).forEach((r) => {
    const s = pptx.addSlide({ masterName: 'HANA' });
    titleBar(s, r.name);
    s.addText(`${r.role}${r.branch ? ' · ' + r.branch : ''}`, { x: 0.5, y: 1.1, w: 9, h: 0.4, fontSize: 13, color: '475569' });
    // Chip skor + level
    s.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 1.7, w: 2.4, h: 1.3, rectRadius: 0.1, fill: { color: levelHex(r.level) } });
    s.addText(Number(r.score).toFixed(2), { x: 0.5, y: 1.85, w: 2.4, h: 0.7, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center' });
    s.addText(statusLabel(r.level), { x: 0.5, y: 2.55, w: 2.4, h: 0.35, fontSize: 11, bold: true, color: 'FFFFFF', align: 'center' });
    // Ringkasan harian
    const text = summaryById[r.user_id] || 'Tidak ada ringkasan AI untuk tanggal ini.';
    s.addText('Ringkasan Hari Ini', { x: 3.2, y: 1.7, w: 9.6, h: 0.4, fontSize: 13, bold: true, color: TEAL });
    s.addText(text, { x: 3.2, y: 2.15, w: 9.6, h: 4.4, fontSize: 14, color: INK, valign: 'top', lineSpacingMultiple: 1.2 });
  });

  // ── Slide penutup ──
  {
    const s = pptx.addSlide({ masterName: 'HANA' });
    titleBar(s, 'Tindak Lanjut');
    const warnNames = (result?.requires_warning_letter || [])
      .map((id) => ranking.find((r) => r.user_id === id)?.name || id);
    if (warnNames.length) {
      s.addText('Disarankan Surat Peringatan', { x: 0.5, y: 1.3, w: 12, h: 0.4, fontSize: 15, bold: true, color: 'EF4444' });
      s.addText(warnNames.map((n) => ({ text: n, options: { bullet: true, color: INK, fontSize: 14, breakLine: true } })), { x: 0.7, y: 1.8, w: 12, h: 2.5, valign: 'top' });
    } else {
      s.addText('Tidak ada rekomendasi surat peringatan untuk periode ini.', { x: 0.5, y: 1.4, w: 12, h: 0.5, fontSize: 14, color: '475569' });
    }
    s.addText('Disusun otomatis oleh ICU Class Bank Hana', { x: 0.5, y: 6.3, w: 12, h: 0.4, fontSize: 11, italic: true, color: MUTED });
  }

  await pptx.writeFile({ fileName: `laporan-regional-${date}.pptx` });
}
