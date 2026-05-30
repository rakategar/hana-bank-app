import { useAuth } from '../../contexts/AuthContext';
import { useSalesDashboard } from '../../hooks/useSalesDashboard';
import Layout from '../../components/Layout';
import CompletionHeatmap from '../../components/CompletionHeatmap';
import WarningBanner from '../../components/WarningBanner';
import { FullSpinner, ErrorBox } from '../../components/ui';
import { TodayStatusCard, PlanDailyStatus, PrimaryActions, NotesCard, SectionTitle } from '../../components/dashboard';
import { slotsForRole } from '../../constants/timeSlots';

export default function FADashboard() {
  const { user } = useAuth();
  const { loading, error, plan, activity, score, completion, warnings, notes, reload } = useSalesDashboard(user);
  const totalSlots = slotsForRole(user.role).length;
  const unread = warnings.filter((w) => !w.is_read).length;

  return (
    <Layout title="Dashboard FA" unreadCount={unread}>
      {loading ? (
        <FullSpinner label="Memuat dashboard..." />
      ) : (
        <div className="space-y-6">
          {error && <ErrorBox>{error}</ErrorBox>}
          <WarningBanner warnings={warnings} onRead={reload} />

          <div>
            <p className="font-display text-2xl font-bold">Halo, {user.name.split(' ')[0]} 👋</p>
            <p className="text-sm text-text-secondary">Financial Advisor · {user.branch}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <TodayStatusCard activity={activity} score={score} totalSlots={totalSlots} />
            <div className="card"><CompletionHeatmap data={completion} /></div>
          </div>

          <PlanDailyStatus plan={plan} activity={activity} score={score} />

          <NotesCard notes={notes} fromLabel="FWSS" />

          <div>
            <SectionTitle>Aksi Cepat</SectionTitle>
            <PrimaryActions />
          </div>
        </div>
      )}
    </Layout>
  );
}
