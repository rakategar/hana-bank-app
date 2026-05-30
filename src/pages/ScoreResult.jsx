import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import ScoreBadge from '../components/ScoreBadge';
import { FullSpinner } from '../components/ui';
import { fetchScore } from '../lib/db';
import { levelInfo, todayISO } from '../lib/utils';

export default function ScoreResult() {
  const { user, dashboardPath } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [result, setResult] = useState(state?.result || null);
  const [loading, setLoading] = useState(!state?.result);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (result) return;
    (async () => {
      try {
        const row = await fetchScore(user.id, todayISO());
        if (row) {
          setResult({
            scores: row.scores,
            daily_average: row.daily_average,
            daily_level: row.daily_level,
            summary: row.summary,
            overall_recommendation: row.overall_recommendation,
          });
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animasi reveal berurutan
  useEffect(() => {
    if (!result?.scores?.length) return;
    setRevealed(0);
    const id = setInterval(() => {
      setRevealed((r) => {
        if (r >= result.scores.length) {
          clearInterval(id);
          return r;
        }
        return r + 1;
      });
    }, 220);
    return () => clearInterval(id);
  }, [result]);

  if (loading) {
    return (
      <Layout title="Hasil Penilaian AI" back={dashboardPath()}>
        <FullSpinner label="Memuat hasil..." />
      </Layout>
    );
  }

  if (!result) {
    return (
      <Layout title="Hasil Penilaian AI" back={dashboardPath()}>
        <div className="card text-center py-10">
          <p className="text-text-secondary text-sm">Belum ada hasil penilaian hari ini.</p>
          <button onClick={() => navigate('/daily-input')} className="btn-teal mt-4 mx-auto">Isi Aktivitas</button>
        </div>
      </Layout>
    );
  }

  const avgInfo = levelInfo(Math.round(result.daily_average));

  return (
    <Layout title="Hasil Penilaian AI" back={dashboardPath()}>
      <div className="space-y-4">
        {/* Summary header */}
        <div className="card text-center animate-fade-in-up" style={{ borderColor: avgInfo?.color }}>
          <p className="text-xs text-text-muted flex items-center justify-center gap-1">
            <Sparkles size={14} className="text-hana-teal-500" /> Dinilai oleh Gemini Flash 2.5
          </p>
          <p className="font-display font-extrabold text-6xl mt-2 leading-none" style={{ color: avgInfo?.color }}>
            {Number(result.daily_average).toFixed(1)}
          </p>
          <div className="mt-2 flex justify-center">
            <ScoreBadge level={result.daily_level} size="lg" />
          </div>
          {result.summary && <p className="text-sm text-text-secondary mt-3 leading-relaxed">{result.summary}</p>}
        </div>

        {/* Per-activity scores */}
        <div className="space-y-3">
          {result.scores.map((s, idx) => {
            const info = levelInfo(s.score);
            const shown = idx < revealed;
            return (
              <div
                key={s.time}
                className={shown ? 'card animate-fade-in-up' : 'card opacity-0'}
                style={{ borderLeftColor: info?.color, borderLeftWidth: 3 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-display font-bold text-hana-teal-500">{s.time}</span>
                    <p className="text-sm font-semibold leading-tight">{s.label}</p>
                  </div>
                  <ScoreBadge score={s.score} showScore />
                </div>
                <p className="text-xs text-text-secondary mt-2">
                  <span className="text-text-muted">Penilaian: </span>{s.reasoning}
                </p>
                <p className="text-xs text-hana-teal-500 mt-1.5">
                  <span className="text-text-muted">Saran: </span>{s.recommendation}
                </p>
              </div>
            );
          })}
        </div>

        {/* Overall recommendation */}
        {result.overall_recommendation && (
          <div className="card bg-hana-teal-500/5 border-hana-teal-500/30">
            <p className="text-sm font-semibold text-hana-teal-500 mb-1">Rekomendasi Utama untuk Besok</p>
            <p className="text-sm text-text-secondary">{result.overall_recommendation}</p>
          </div>
        )}

        <button onClick={() => navigate(dashboardPath())} className="btn-teal w-full">
          <ArrowLeft size={16} /> Kembali ke Dashboard
        </button>
      </div>
    </Layout>
  );
}
