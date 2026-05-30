import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoTime } from '../../contexts/DemoTimeContext';
import { useSalesDashboard } from '../../hooks/useSalesDashboard';
import Layout from '../../components/Layout';
import ActivityWatch from '../../components/ActivityWatch';
import WarningBanner from '../../components/WarningBanner';
import MonitorCard from '../../components/MonitorCard';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import { FullSpinner, ErrorBox } from '../../components/ui';
import { TodayStatusCard, PlanDailyStatus, PrimaryActions, NotesCard, SectionTitle } from '../../components/dashboard';
import { fetchSubordinates, fetchUserDaySnapshot } from '../../lib/db';
import { slotsForRole } from '../../constants/timeSlots';

export default function BMDashboard() {
  const { user } = useAuth();
  const { now } = useDemoTime();
  const navigate = useNavigate();
  const { loading, error, plan, activity, score, warnings, notes, reload } = useSalesDashboard(user, now.getTime());
  const totalSlots = slotsForRole(user.role).length;

  const [tree, setTree] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [detailUser, setDetailUser] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const fwssList = await fetchSubordinates(user.id);
        const built = await Promise.all(
          fwssList.map(async (fwss) => {
            const fwssSnap = await fetchUserDaySnapshot(fwss);
            const fas = await fetchSubordinates(fwss.id);
            const faSnaps = await Promise.all(fas.map((fa) => fetchUserDaySnapshot(fa)));
            return { fwss: fwssSnap, fas: faSnaps };
          })
        );
        setTree(built);
      } catch {
        /* visual */
      } finally {
        setTeamLoading(false);
      }
    })();
  }, [user.id]);

  const unread = warnings.filter((w) => !w.is_read).length;

  return (
    <Layout title="Dashboard BM" unreadCount={unread}>
      {loading ? (
        <FullSpinner label="Memuat dashboard..." />
      ) : (
        <div className="space-y-6">
          {error && <ErrorBox>{error}</ErrorBox>}
          <WarningBanner warnings={warnings} onRead={reload} />

          <div>
            <p className="font-display text-2xl font-bold">Halo, {user.name.split(' ')[0]} 👋</p>
            <p className="text-sm text-text-secondary">Branch Manager · {user.branch}</p>
          </div>

          <TodayStatusCard activity={activity} score={score} totalSlots={totalSlots} />
          <ActivityWatch userId={user.id} end={now} />

          <PlanDailyStatus plan={plan} activity={activity} score={score} />
          <PrimaryActions />

          <NotesCard notes={notes} fromLabel="RH" />

          <div>
            <SectionTitle action={
              <button onClick={() => navigate('/summary/bm')} className="btn-teal !py-2 text-xs">
                <Bot size={14} /> Generate Summary Tim
              </button>
            }>
              Monitoring FWSS &amp; FA
            </SectionTitle>
            {teamLoading ? (
              <div className="grid gap-4"><div className="skeleton h-24" /><div className="skeleton h-24" /></div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-5">
                {tree.map(({ fwss, fas }) => (
                  <div key={fwss.user.id} className="space-y-2">
                    <MonitorCard snapshot={fwss} onClick={() => setDetailUser(fwss.user)} />
                    <div className="pl-4 border-l-2 border-hana-border ml-3 space-y-2">
                      {fas.map((fa) => (
                        <MonitorCard key={fa.user.id} snapshot={fa} compact onClick={() => setDetailUser(fa.user)} />
                      ))}
                    </div>
                  </div>
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
