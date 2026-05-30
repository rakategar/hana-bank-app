import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

// Setelah submit, FA/FWSS/BM TIDAK melihat skornya sendiri.
// Halaman ini hanya konfirmasi bahwa penilaian sudah terkirim ke atasan.
export default function ScoreResult() {
  const { user, dashboardPath } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const submitted = state?.submitted ?? true;

  const supervisorLabel = { FA: 'FWSS', FWSS: 'BM', BM: 'RH' }[user.role] || 'atasan';

  return (
    <Layout title="Penilaian Terkirim" back={dashboardPath()}>
      <div className="max-w-xl mx-auto">
        <div className="card text-center py-10 animate-fade-in-up">
          <div className="h-16 w-16 rounded-full bg-hana-teal-50 grid place-items-center mx-auto mb-4">
            <CheckCircle2 size={36} className="text-hana-teal-600" />
          </div>
          <h2 className="font-display text-2xl font-bold">
            {submitted ? 'Aktivitas Berhasil Dinilai AI' : 'Aktivitas Tersimpan'}
          </h2>
          <p className="text-sm text-text-secondary mt-2 max-w-sm mx-auto leading-relaxed">
            Terima kasih, {user.name.split(' ')[0]}. Penilaian AI atas aktivitas hari ini sudah
            tercatat dan diteruskan ke <b>{supervisorLabel}</b> Anda untuk evaluasi.
          </p>

          <div className="mt-6 mx-auto max-w-sm rounded-lg bg-elevated border border-hana-border px-4 py-3 flex items-start gap-2.5 text-left">
            <Lock size={16} className="text-text-muted mt-0.5 shrink-0" />
            <p className="text-xs text-text-secondary">
              Sesuai kebijakan ICU Class, skor Anda tidak ditampilkan ke diri sendiri.
              Hasil penilaian hanya dapat dilihat oleh atasan untuk keperluan coaching.
            </p>
          </div>

          <button onClick={() => navigate(dashboardPath())} className="btn-teal mx-auto mt-6">
            <ArrowLeft size={16} /> Kembali ke Dashboard
          </button>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted mt-4">
          <ShieldCheck size={13} /> Data tersimpan aman di Supabase
        </p>
      </div>
    </Layout>
  );
}
