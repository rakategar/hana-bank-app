import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';
import SalesDashboard from '../../components/SalesDashboard';
import MonitorCard from '../../components/MonitorCard';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import { SectionTitle } from '../../components/dashboard';
import { fetchSubordinates, fetchUserDaySnapshot } from '../../lib/db';

function MonitoringFA({ userId }) {
  const navigate = useNavigate();
  const [team, setTeam] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [detailUser, setDetailUser] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const subs = await fetchSubordinates(userId);
        const snaps = await Promise.all(subs.map((s) => fetchUserDaySnapshot(s)));
        if (alive) setTeam(snaps);
      } catch {
        /* handled visually */
      } finally {
        if (alive) setTeamLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  return (
    <>
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
      <ActivityDetailModal user={detailUser} open={Boolean(detailUser)} onClose={() => setDetailUser(null)} />
    </>
  );
}

export default function FWSSDashboard() {
  return (
    <SalesDashboard pageTitle="Dashboard FWSS" notesFrom="BM">
      {({ user }) => <MonitoringFA userId={user.id} />}
    </SalesDashboard>
  );
}
