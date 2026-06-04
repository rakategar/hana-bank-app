import { serializeStructuredData, formatDateID, ROLE_LABELS } from './utils';

// Library export berat (jspdf/pptxgenjs) di-load dinamis agar tidak membebani bundle awal.

const STATUS_ID = { done: 'Selesai', partial: 'Sebagian', not_done: 'Tidak Selesai' };
const TEAL = '026B58';
const INK = '1F2933';

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

// ── PPT: laporan ringkasan keseluruhan (RH) ──
export async function exportOverallPPT({ rhName, date, team = [], result }) {
  const { default: pptxgen } = await import('pptxgenjs');
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  const accent = `#${TEAL}`;

  // Slide 1 — judul
  const s1 = pptx.addSlide();
  s1.background = { color: 'F4F6FA' };
  s1.addText('Laporan Kinerja Regional', { x: 0.6, y: 1.8, w: 11, h: 0.9, fontSize: 36, bold: true, color: TEAL });
  s1.addText('ICU Class Bank Hana', { x: 0.6, y: 2.7, w: 11, h: 0.5, fontSize: 20, color: INK });
  s1.addText(`${formatDateID(date)}${rhName ? '  ·  ' + rhName : ''}`, { x: 0.6, y: 3.3, w: 11, h: 0.4, fontSize: 14, color: '475569' });

  // Slide 2 — executive summary
  if (result?.executive_summary) {
    const s = pptx.addSlide();
    s.addText('Executive Summary', { x: 0.5, y: 0.4, w: 12, h: 0.6, fontSize: 26, bold: true, color: TEAL });
    if (result.team_overall_status) {
      s.addText(String(result.team_overall_status).toUpperCase().replace(/_/g, ' '), { x: 0.5, y: 1.0, w: 5, h: 0.4, fontSize: 13, bold: true, color: 'F97316' });
    }
    s.addText(result.executive_summary, { x: 0.5, y: 1.5, w: 12, h: 4.5, fontSize: 15, color: INK, valign: 'top' });
  }

  // Slide 3 — ranking
  if (result?.performance_ranking?.length) {
    const s = pptx.addSlide();
    s.addText('Ranking Performa', { x: 0.5, y: 0.4, w: 12, h: 0.6, fontSize: 26, bold: true, color: TEAL });
    const rows = [
      [
        { text: 'Rank', options: { bold: true, color: 'FFFFFF', fill: TEAL } },
        { text: 'Nama', options: { bold: true, color: 'FFFFFF', fill: TEAL } },
        { text: 'Role', options: { bold: true, color: 'FFFFFF', fill: TEAL } },
        { text: 'Skor', options: { bold: true, color: 'FFFFFF', fill: TEAL } },
        { text: 'Level', options: { bold: true, color: 'FFFFFF', fill: TEAL } },
      ],
      ...result.performance_ranking.map((r) => [
        String(r.rank ?? ''),
        String(r.name ?? ''),
        String(r.role ?? ''),
        r.score != null ? Number(r.score).toFixed(1) : '-',
        String(r.level ?? '-'),
      ]),
    ];
    s.addTable(rows, { x: 0.5, y: 1.2, w: 12, fontSize: 13, border: { type: 'solid', color: 'E2E8F0', pt: 1 }, color: INK });
  }

  // Slide 4 — risk flags
  if (result?.risk_flags?.length) {
    const s = pptx.addSlide();
    s.addText('Risk Flags', { x: 0.5, y: 0.4, w: 12, h: 0.6, fontSize: 26, bold: true, color: 'EF4444' });
    s.addText(
      result.risk_flags.map((r) => ({ text: `${r.name}: ${r.issue} (${r.urgency})`, options: { bullet: true, color: INK, fontSize: 14, breakLine: true } })),
      { x: 0.6, y: 1.3, w: 12, h: 5, valign: 'top' }
    );
  }

  // Slide 5 — rekomendasi strategis
  if (result?.strategic_recommendations?.length) {
    const s = pptx.addSlide();
    s.addText('Rekomendasi Strategis', { x: 0.5, y: 0.4, w: 12, h: 0.6, fontSize: 26, bold: true, color: TEAL });
    s.addText(
      result.strategic_recommendations.map((r) => ({ text: r, options: { bullet: true, color: INK, fontSize: 15, breakLine: true } })),
      { x: 0.6, y: 1.3, w: 12, h: 5, valign: 'top' }
    );
  }

  // Slide 6 — skor tim
  if (team.length) {
    const s = pptx.addSlide();
    s.addText('Skor Tim', { x: 0.5, y: 0.4, w: 12, h: 0.6, fontSize: 26, bold: true, color: TEAL });
    const rows = [
      ['Nama', 'Role', 'Cabang', 'Skor', 'Level'].map((t) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: TEAL } })),
      ...team.map((u) => [
        String(u.name ?? ''),
        String(u.role ?? ''),
        String(u.branch ?? '-'),
        u.daily_average != null ? Number(u.daily_average).toFixed(2) : '-',
        String(u.daily_level ?? '-'),
      ]),
    ];
    s.addTable(rows, { x: 0.5, y: 1.2, w: 12, fontSize: 12, border: { type: 'solid', color: 'E2E8F0', pt: 1 }, color: INK });
  }

  await pptx.writeFile({ fileName: `laporan-regional-${date}.pptx` });
}
