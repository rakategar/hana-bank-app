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
import { TodayStatusCard, PlanDailyStatus, PrimaryActions, NotesCard, SectionTitle, DashboardIntro } from '../../components/dashboard';
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

          <DashboardIntro title={`Halo, ${user.name.split(' ')[0]}`} subtitle={`Field Working Sales Supervisor - ${user.branch}`} />

          <TodayStatusCard activity={activity} score={score} totalSlots={totalSlots} />
          <ActivityWatch userId={user.id} role={user.role} />

          <PlanDailyStatus plan={plan} activity={activity} score={score} />
          <PrimaryActions />

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
              <p className="text-sm text-text-muted">Tidak ada FA di bawah Anda.</p>
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
