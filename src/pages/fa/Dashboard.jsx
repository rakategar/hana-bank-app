import { useAuth } from '../../contexts/AuthContext';
import { useSalesDashboard } from '../../hooks/useSalesDashboard';
import Layout from '../../components/Layout';
import Heatmap from '../../components/Heatmap';
import WarningBanner from '../../components/WarningBanner';
import { FullSpinner, ErrorBox } from '../../components/ui';
import { ScoreCard, PlanDailyStatus, PrimaryActions, NotesCard, SectionTitle } from '../../components/dashboard';
import { todayISO } from '../../lib/utils';

export default function FADashboard() {
  const { user } = useAuth();
  const { loading, error, plan, activity, score, heatmap, warnings, notes, reload } = useSalesDashboard(user);

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
            <p className="text-sm text-text-muted">Financial Advisor · {user.branch}</p>
          </div>

          <ScoreCard score={score} date={todayISO()} />

          <div className="card">
            <Heatmap data={heatmap} />
          </div>

          <PlanDailyStatus plan={plan} activity={activity} score={score} />

          <NotesCard notes={notes} fromLabel="FWSS" />

          <div className="pt-1">
            <SectionTitle>Aksi Cepat</SectionTitle>
            <PrimaryActions />
          </div>
        </div>
      )}
    </Layout>
  );
}
