import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSalesDashboard } from '../../hooks/useSalesDashboard';
import { useNowKey } from '../../hooks/useNowKey';
import Layout from '../../components/Layout';
import ActivityWatch from '../../components/ActivityWatch';
import WarningBanner from '../../components/WarningBanner';
import MonitorCard from '../../components/MonitorCard';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import { FullSpinner, ErrorBox } from '../../components/ui';
import { TodayStatusCard, PrimaryActions, NotesCard, SectionTitle } from '../../components/dashboard';
import { fetchSubordinates, fetchUserDaySnapshot } from '../../lib/db';
import { slotsForRole } from '../../constants/timeSlots';

export default function FWSSDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nowKey = useNowKey();
  const { loading, error, plan, activity, score, warnings, notes, reload } = useSalesDashboard(user, nowKey);
  const totalSlots = slotsForRole(user.role).length;

  const [team, setTeam] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [detailUser, setDetailUser] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const subs = await fetchSubordinates(user.id);
        const snaps = await Promise.all(subs.map((s) => fetchUserDaySnapshot(s)));
        setTeam(snaps);
      } catch {
        /* handled visually */
      } finally {
        setTeamLoading(false);
      }
    })();
  }, [user.id]);

  const unread = warnings.filter((w) => !w.is_read).length;

  return (
    <Layout title="Dashboard FWSS" unreadCount={unread}>
      {loading ? (
        <FullSpinner label="Memuat dashboard..." />
      ) : (
        <div className="space-y-6">
          {error && <ErrorBox>{error}</ErrorBox>}
          <WarningBanner warnings={warnings} onRead={reload} />

          <div>
            <p className="font-display text-2xl font-bold">Halo, {user.name.split(' ')[0]} 👋</p>
            <p className="text-sm text-text-secondary">Field Working Sales Supervisor · {user.branch}</p>
          </div>

          <TodayStatusCard activity={activity} score={score} totalSlots={totalSlots} />
          <ActivityWatch userId={user.id} role={user.role} />

          <PrimaryActions role={user.role} />

          <NotesCard notes={notes} fromLabel="BM" />

          <div>
            <SectionTitle action={
              <button onClick={() => navigate('/summary/fwss')} className="btn-teal !py-2 text-xs">
                <Bot size={14} /> Generate Summary FA
              </button>
            }>
              Monitoring FA
            </SectionTitle>
            {teamLoading ? (
              <div className="grid sm:grid-cols-2 gap-4"><div className="skeleton h-24" /><div className="skeleton h-24" /></div>
            ) : team.length === 0 ? (
              <div className="card border-score-2/40 bg-score-2/10">
                <p className="text-sm font-semibold text-score-2 mb-1">Belum ada FA terdeteksi</p>
                <p className="text-xs text-text-secondary leading-relaxed mb-3">
                  Pastikan akun FA yang Anda bimbing sudah mendaftar dan memilih Anda sebagai atasan.
                  Jika Anda baru mendaftar, minta FA Anda memperbarui atasan mereka.
                </p>
                <button onClick={() => navigate('/onboarding')} className="btn-ghost !py-1.5 text-xs">
                  Perbarui Profil / Atasan Saya
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {team.map((snap) => (
                  <MonitorCard key={snap.user.id} snapshot={snap} onClick={() => setDetailUser(snap.user)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ActivityDetailModal user={detailUser} open={Boolean(detailUser)} onClose={() => setDetailUser(null)} />
    </Layout>
  );
}
