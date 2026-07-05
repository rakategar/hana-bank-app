import { useAuth } from '../../contexts/AuthContext';
import { useSalesDashboard } from '../../hooks/useSalesDashboard';
import { useNowKey } from '../../hooks/useNowKey';
import Layout from '../../components/Layout';
import ActivityWatch from '../../components/ActivityWatch';
import WarningBanner from '../../components/WarningBanner';
import { FullSpinner, ErrorBox } from '../../components/ui';
import { TodayStatusCard, PlanDailyStatus, PrimaryActions, NotesCard, SectionTitle } from '../../components/dashboard';
import { slotsForRole } from '../../constants/timeSlots';

export default function FADashboard() {
  const { user } = useAuth();
  const nowKey = useNowKey();
  const { loading, error, plan, activity, score, warnings, notes, reload } = useSalesDashboard(user, nowKey);
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

          <TodayStatusCard activity={activity} score={score} totalSlots={totalSlots} />
          <ActivityWatch userId={user.id} role={user.role} />

          <PlanDailyStatus plan={plan} activity={activity} score={score} />

          <NotesCard notes={notes} fromLabel="FWSS" />

          <div>
            <SectionTitle>Aksi Cepat</SectionTitle>
            <PrimaryActions role={user.role} />
          </div>
        </div>
      )}
    </Layout>
  );
}
