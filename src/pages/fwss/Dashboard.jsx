import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSalesDashboard } from '../../hooks/useSalesDashboard';
import Layout from '../../components/Layout';
import Heatmap from '../../components/Heatmap';
import WarningBanner from '../../components/WarningBanner';
import MonitorCard from '../../components/MonitorCard';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import { FullSpinner, ErrorBox } from '../../components/ui';
import { ScoreCard, PlanDailyStatus, PrimaryActions, NotesCard, SectionTitle } from '../../components/dashboard';
import { fetchSubordinates, fetchUserDaySnapshot } from '../../lib/db';
import { todayISO } from '../../lib/utils';

export default function FWSSDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loading, error, plan, activity, score, heatmap, warnings, notes, reload } = useSalesDashboard(user);

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
    <Layout unreadCount={unread}>
      {loading ? (
        <FullSpinner label="Memuat dashboard..." />
      ) : (
        <div className="space-y-4">
          {error && <ErrorBox>{error}</ErrorBox>}
          <WarningBanner warnings={warnings} onRead={reload} />

          <div>
            <p className="font-display text-2xl font-bold">Halo, {user.name.split(' ')[0]} 👋</p>
            <p className="text-sm text-text-muted">FWSS · {user.branch}</p>
          </div>

          <ScoreCard score={score} date={todayISO()} />
          <div className="card"><Heatmap data={heatmap} /></div>
          <PlanDailyStatus plan={plan} activity={activity} score={score} />
          <PrimaryActions />

          <NotesCard notes={notes} fromLabel="BM" />

          <div>
            <SectionTitle>Monitoring FA</SectionTitle>
            {teamLoading ? (
              <div className="grid gap-3"><div className="skeleton h-20" /><div className="skeleton h-20" /></div>
            ) : team.length === 0 ? (
              <p className="text-sm text-text-muted">Tidak ada FA di bawah Anda.</p>
            ) : (
              <div className="grid gap-3">
                {team.map((snap) => (
                  <MonitorCard key={snap.user.id} snapshot={snap} onClick={() => setDetailUser(snap.user)} />
                ))}
              </div>
            )}
          </div>

          <button onClick={() => navigate('/summary/fwss')} className="btn-teal w-full">
            <Bot size={18} /> Generate Summary FA
          </button>
        </div>
      )}

      <ActivityDetailModal user={detailUser} open={Boolean(detailUser)} onClose={() => setDetailUser(null)} />
    </Layout>
  );
}
