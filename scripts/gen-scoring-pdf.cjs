/* Generator PDF "Panduan Ringkas: Bagaimana AI Menilai Kinerja Harian"
   Palet Bank Hana, bahasa awam, + tabel rubrik penilaian per peran.
   Rubrik dibaca langsung dari src/constants/scoringRubric.js agar selalu sinkron.
   Jalankan: node scripts/gen-scoring-pdf.cjs */
const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');

// ── Baca rubrik dari sumber (ESM) tanpa duplikasi data ──
function loadRubrics() {
  let src = fs.readFileSync(path.join(__dirname, '..', 'src', 'constants', 'scoringRubric.js'), 'utf8');
  src = src.replace(/export /g, '');
  return new Function(src + '\nreturn { FA_RUBRIC, FWSS_RUBRIC, BM_RUBRIC };')();
}
const { FA_RUBRIC, FWSS_RUBRIC, BM_RUBRIC } = loadRubrics();

// ── Palet Bank Hana ──
const TEAL = [2, 107, 88];
const TEAL_D = [15, 42, 36];
const TEAL_50 = [234, 249, 246];
const PINK = [230, 37, 96];
const INK = [31, 41, 51];
const SEC = [71, 85, 105];
const MUTED = [148, 163, 184];
const BORDER = [226, 232, 240];
const LEVELS = [
  { n: 1, name: 'CRITICAL', arti: 'Perlu perbaikan besar', c: [239, 68, 68], tint: [254, 235, 235] },
  { n: 2, name: 'RECOVERY', arti: 'Masih di bawah target', c: [249, 115, 22], tint: [255, 242, 230] },
  { n: 3, name: 'ON TRACK', arti: 'Sesuai harapan', c: [59, 130, 246], tint: [235, 242, 254] },
  { n: 4, name: 'HIGH IMPACT', arti: 'Sangat baik', c: [34, 197, 94], tint: [233, 250, 239] },
];

const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
const W = 210, H = 297, M = 16;
const CW = W - M * 2;
const logo = fs.readFileSync(path.join(__dirname, '..', 'public', 'hana-bank-logo.png')).toString('base64');

const fill = (c) => doc.setFillColor(c[0], c[1], c[2]);
const text = (c) => doc.setTextColor(c[0], c[1], c[2]);
const draw = (c) => doc.setDrawColor(c[0], c[1], c[2]);

function header(title, sub) {
  fill(TEAL); doc.rect(0, 0, W, 32, 'F');
  fill([255, 255, 255]); doc.roundedRect(M, 7, 18, 18, 3, 3, 'F');
  doc.addImage(logo, 'PNG', M + 2, 9, 14, 14);
  text([255, 255, 255]); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
  doc.text(title, M + 24, 15);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  text(TEAL_50); doc.text(sub, M + 24, 22);
}

function section(y, no, title) {
  fill(TEAL); doc.roundedRect(M, y - 5, 6.5, 6.5, 1.5, 1.5, 'F');
  text([255, 255, 255]); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text(String(no), M + 3.25, y - 0.4, { align: 'center' });
  text(TEAL); doc.setFontSize(13); doc.text(title, M + 10, y);
  return y + 7;
}

function para(y, str, color = SEC, size = 10.5, lh = 5) {
  text(color); doc.setFont('helvetica', 'normal'); doc.setFontSize(size);
  const lines = doc.splitTextToSize(str, CW);
  doc.text(lines, M, y);
  return y + lines.length * lh;
}

function bullet(y, str, size = 10.5) {
  fill(PINK); doc.circle(M + 1.4, y - 1.4, 1, 'F');
  text(SEC); doc.setFont('helvetica', 'normal'); doc.setFontSize(size);
  const lines = doc.splitTextToSize(str, CW - 6);
  doc.text(lines, M + 5, y);
  return y + lines.length * 5 + 1.5;
}

// ══════════════ HALAMAN 1 ══════════════
header('Bagaimana AI Menilai Kinerja Harian', 'Panduan Ringkas · ICU Class Bank Hana');
let y = 44;

y = section(y, 1, 'Apa yang Dinilai?');
y = para(y, 'Setiap hari kerja, sistem menilai kualitas pelaksanaan aktivitas tiap peran (FA, FWSS, dan BM). Penilaian dilakukan otomatis oleh AI berdasarkan standar penilaian (rubrik) baku Bank Hana, agar hasilnya objektif dan seragam untuk semua orang. Rincian rubrik tiap peran ada di halaman berikutnya.');
y += 4;

y = section(y, 2, 'Data yang Digunakan');
y = para(y, 'Untuk menilai satu aktivitas, sistem melihat:', SEC, 10.5, 5);
y += 1;
y = bullet(y, 'Jam dan nama kegiatan sesuai jadwal.');
y = bullet(y, 'Hasil nyata yang diisi — apa yang benar-benar dikerjakan.');
y = bullet(y, 'Status penyelesaian: Selesai, Sebagian, atau Tidak Selesai.');
y = bullet(y, 'Catatan tambahan bila ada.');
y = bullet(y, 'Khusus FA: hasil nyata dibandingkan dengan Rencana Mingguan. Makin sesuai rencana, makin tinggi nilainya.');
y += 3;

y = section(y, 3, 'Skala Nilai');
const rowH = 9, tX = M, tW = CW, col = [tX + 4, tX + 22, tX + 62];
fill(TEAL_D); doc.roundedRect(tX, y - 1, tW, 7, 1, 1, 'F');
text([255, 255, 255]); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
doc.text('NILAI', col[0], y + 3.5); doc.text('LEVEL', col[1], y + 3.5); doc.text('ARTINYA', col[2], y + 3.5);
let ty = y + 6;
LEVELS.forEach((lv, i) => {
  if (i % 2 === 1) { fill(TEAL_50); doc.rect(tX, ty, tW, rowH, 'F'); }
  fill(lv.c); doc.roundedRect(col[0] - 1, ty + 1.8, 8, 5.4, 1, 1, 'F');
  text([255, 255, 255]); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text(String(lv.n), col[0] + 3, ty + 5.6, { align: 'center' });
  text(INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(lv.name, col[1], ty + 5.8);
  text(SEC); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(lv.arti, col[2], ty + 5.8);
  ty += rowH;
});
draw(BORDER); doc.setLineWidth(0.3); doc.roundedRect(tX, y - 1, tW, rowH * 4 + 7, 1, 1, 'S');
y = ty + 6;

fill([253, 236, 242]); doc.roundedRect(M, y, CW, 12, 2, 2, 'F');
text(PINK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text('Penting:', M + 4, y + 5);
text(SEC); doc.setFont('helvetica', 'normal');
doc.text('Jika hasil nyata dikosongkan atau status "Tidak Selesai", nilainya otomatis 1 (CRITICAL).', M + 20, y + 5, { maxWidth: CW - 24 });

// ══════════════ HALAMAN 2 ══════════════
doc.addPage();
header('Cara Menghitung Rata-rata Nilai', 'Panduan Ringkas · ICU Class Bank Hana');
y = 44;

y = section(y, 4, 'Rumus Rata-rata');
const boxes = [
  ['Rata-rata Harian', 'Jumlah nilai semua kegiatan dalam sehari  ÷  jumlah kegiatan.'],
  ['Level Harian', 'Rata-rata harian dibulatkan ke angka terdekat (1–4), lalu dipetakan ke level warna.'],
  ['Rata-rata Periode (mingguan)', 'Rata-rata dari nilai-nilai harian. Hanya hari kerja (Senin–Jumat) yang ADA datanya dihitung; akhir pekan dan hari tanpa data tidak ikut, sehingga tidak menurunkan nilai.'],
  ['Rata-rata Tim', 'Rata-rata nilai seluruh anggota yang sudah punya nilai pada periode itu.'],
];
boxes.forEach(([t, d]) => {
  const lines = doc.splitTextToSize(d, CW - 12);
  const bh = 8 + lines.length * 4.6;
  fill([248, 250, 252]); draw(BORDER); doc.setLineWidth(0.3); doc.roundedRect(M, y, CW, bh, 2, 2, 'FD');
  fill(TEAL); doc.roundedRect(M, y, 2.5, bh, 1, 1, 'F');
  text(TEAL); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(t, M + 6, y + 5.5);
  text(SEC); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(lines, M + 6, y + 10.5);
  y += bh + 3.5;
});
y += 2;

y = section(y, 5, 'Contoh Sederhana');
fill(TEAL_50); doc.roundedRect(M, y, CW, 22, 2, 2, 'F');
text(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
doc.text('Seorang FA punya 5 kegiatan dengan nilai:  3, 4, 2, 3, 3.', M + 5, y + 6.5);
doc.setFont('helvetica', 'bold'); text(TEAL);
doc.text('Rata-rata = (3+4+2+3+3) ÷ 5 = 15 ÷ 5 = 3,0', M + 5, y + 12.5);
text(INK); doc.setFont('helvetica', 'normal');
const prefix = 'Dibulatkan tetap 3, jadi Level ';
doc.text(prefix, M + 5, y + 18);
doc.setFont('helvetica', 'bold'); text([59, 130, 246]);
doc.text('ON TRACK (sesuai harapan).', M + 5 + doc.getTextWidth(prefix), y + 18);
y += 28;

y = section(y, 6, 'Tips agar Nilai Maksimal');
y = bullet(y, 'Isi kolom hasil nyata selengkap mungkin, bukan sekadar terisi.');
y = bullet(y, 'Selesaikan aktivitas dan tandai statusnya dengan benar.');
y = bullet(y, 'Khusus FA: jaga agar realisasi sesuai Rencana Mingguan.');

// ══════════════ HALAMAN RUBRIK per peran ══════════════
const LABEL_W = 40;
const CELL_W = (CW - LABEL_W) / 4;

function rubricHeaderRow(yTop) {
  fill(TEAL_D); doc.rect(M, yTop, LABEL_W, 8, 'F');
  text([255, 255, 255]); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('JAM & KEGIATAN', M + 2, yTop + 5);
  LEVELS.forEach((lv, i) => {
    const cx = M + LABEL_W + i * CELL_W;
    fill(lv.c); doc.rect(cx, yTop, CELL_W, 8, 'F');
    text([255, 255, 255]); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
    doc.text(lv.n + '  ' + lv.name, cx + CELL_W / 2, yTop + 5, { align: 'center' });
  });
  return yTop + 8;
}

function drawRubric(rubric, roleCode, roleTitle, roleDesc) {
  doc.addPage();
  header('Standar Penilaian: ' + roleCode, roleTitle + ' · ICU Class Bank Hana');
  let yy = 42;
  text(SEC); doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
  yy = (function () { const l = doc.splitTextToSize(roleDesc, CW); doc.text(l, M, yy); return yy + l.length * 4.4; })();
  yy += 2;
  yy = rubricHeaderRow(yy);

  const entries = Object.entries(rubric);
  entries.forEach(([time, { label, criteria }], idx) => {
    // hitung tinggi baris
    doc.setFontSize(7.3);
    const cellLines = LEVELS.map((lv) => doc.splitTextToSize(criteria[lv.n], CELL_W - 3));
    const kegLines = doc.splitTextToSize(label, LABEL_W - 4);
    const maxLines = Math.max(cellLines[0].length, cellLines[1].length, cellLines[2].length, cellLines[3].length, kegLines.length + 1);
    const rH = Math.max(11, 3.6 + maxLines * 3.15);

    // page break bila perlu
    if (yy + rH > H - 16) {
      doc.addPage();
      header('Standar Penilaian: ' + roleCode + ' (lanjutan)', roleTitle + ' · ICU Class Bank Hana');
      yy = 42;
      yy = rubricHeaderRow(yy);
    }

    // zebra
    if (idx % 2 === 1) { fill([248, 250, 252]); doc.rect(M, yy, CW, rH, 'F'); }
    // kolom jam & kegiatan
    text(TEAL); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text(time, M + 2, yy + 5);
    text(INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.3); doc.text(kegLines, M + 2, yy + 9);
    // kolom kriteria
    LEVELS.forEach((lv, i) => {
      const cx = M + LABEL_W + i * CELL_W;
      text(SEC); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.3);
      doc.text(cellLines[i], cx + 1.5, yy + 5);
    });
    // garis pemisah
    draw(BORDER); doc.setLineWidth(0.2); doc.line(M, yy + rH, M + CW, yy + rH);
    yy += rH;
  });
  // border luar & garis vertikal kolom
  draw(BORDER); doc.setLineWidth(0.3);
  // (garis atas tabel sudah oleh header row)
}

drawRubric(FA_RUBRIC, 'FA', 'Financial Advisor', 'Peran penjualan lini depan. Aktivitas dinilai dengan membandingkan Rencana Mingguan (planned) dengan realisasi (actual): makin kecil selisihnya, makin tinggi nilainya.');
drawRubric(FWSS_RUBRIC, 'FWSS', 'Field Work Sales Supervisor', 'Supervisor lapangan. Dinilai dari kualitas pengarahan, monitoring, dan pemulihan (recovery) kinerja tim FA sepanjang hari.');
drawRubric(BM_RUBRIC, 'BM', 'Branch Manager', 'Kepala cabang. Dinilai dari arah bisnis, koordinasi cabang, dan dukungan terhadap tim untuk mendorong hasil.');

// ── Footer otomatis di semua halaman ──
const total = doc.getNumberOfPages();
const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
for (let p = 1; p <= total; p++) {
  doc.setPage(p);
  draw(BORDER); doc.setLineWidth(0.3); doc.line(M, H - 14, W - M, H - 14);
  text(MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('Disusun otomatis oleh sistem ICU Class · Bank Hana', M, H - 9);
  doc.text(today + '   ·   Halaman ' + p + '/' + total, W - M, H - 9, { align: 'right' });
}

const out = path.join(__dirname, '..', 'docs', 'Penjelasan-AI-Scoring.pdf');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(doc.output('arraybuffer')));
console.log('PDF dibuat:', out, Math.round(fs.statSync(out).size / 1024) + 'KB', '·', total, 'halaman');
