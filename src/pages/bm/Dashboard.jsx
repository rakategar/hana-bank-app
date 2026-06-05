import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';
import SalesDashboard from '../../components/SalesDashboard';
import MonitorCard from '../../components/MonitorCard';
import ActivityDetailModal from '../../components/ActivityDetailModal';
import { SectionTitle } from '../../components/dashboard';
import { fetchSubordinates, fetchUserDaySnapshot } from '../../lib/db';

function MonitoringTeam({ userId }) {
  const navigate = useNavigate();
  const [tree, setTree] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [detailUser, setDetailUser] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fwssList = await fetchSubordinates(userId);
        const built = await Promise.all(
          fwssList.map(async (fwss) => {
            const fwssSnap = await fetchUserDaySnapshot(fwss);
            const fas = await fetchSubordinates(fwss.id);
            const faSnaps = await Promise.all(fas.map((fa) => fetchUserDaySnapshot(fa)));
            return { fwss: fwssSnap, fas: faSnaps };
          })
        );
        if (alive) setTree(built);
      } catch {
        /* visual */
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
      <ActivityDetailModal user={detailUser} open={Boolean(detailUser)} onClose={() => setDetailUser(null)} />
    </>
  );
}

export default function BMDashboard() {
  return (
    <SalesDashboard pageTitle="Dashboard BM" notesFrom="RH">
      {({ user }) => <MonitoringTeam userId={user.id} />}
    </SalesDashboard>
  );
}
