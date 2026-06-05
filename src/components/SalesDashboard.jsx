import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useSalesDashboard } from '../hooks/useSalesDashboard';
import { useNowKey } from '../hooks/useNowKey';
import Layout from './Layout';
import ActivityWatch from './ActivityWatch';
import WarningBanner from './WarningBanner';
import { FullSpinner, DashboardSkeleton } from './ui';
import {
  TodayStatusCard,
  PlanDailyStatus,
  PrimaryActions,
  NotesCard,
  DashboardIntro,
} from './dashboard';
import { slotsForRole } from '../constants/timeSlots';
import { ROLE_LABELS } from '../lib/utils';

/**
 * Layout bersama untuk dashboard FA, FWSS, dan BM.
 *
 * Merender bagian-bagian yang identik di ketiga role:
 *   WarningBanner → DashboardIntro → TodayStatusCard → ActivityWatch →
 *   PlanDailyStatus → PrimaryActions → NotesCard
 *
 * Bagian khusus per role (misalnya monitoring bawahan) dimasukkan
 * lewat `children`. Render function children menerima objek
 * `{ user, nowKey }` agar child bisa fetch data tambahan.
 *
 * @param {string}   props.pageTitle  – judul di header Layout (mis. "Dashboard FA")
 * @param {string}   props.notesFrom  – label sumber catatan (mis. "FWSS", "BM", "RH")
 * @param {function} [props.children] – render function: ({ user, nowKey }) => ReactNode
 */
export default function SalesDashboard({ pageTitle, notesFrom, children }) {
  const { user } = useAuth();
  const nowKey = useNowKey();
  const { loading, error, plan, activity, score, warnings, notes, reload } =
    useSalesDashboard(user, nowKey);
  const totalSlots = slotsForRole(user.role).length;
  const unread = warnings.filter((w) => !w.is_read).length;

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const roleLabel = ROLE_LABELS[user.role] || user.role;

  return (
    <Layout title={pageTitle} unreadCount={unread}>
      {loading ? (
        <DashboardSkeleton stats={3} showTabs={false} />
      ) : (
        <div className="space-y-6">
          <WarningBanner warnings={warnings} onRead={reload} />

          <DashboardIntro
            title={`Halo, ${user.name.split(' ')[0]}`}
            subtitle={`${roleLabel} - ${user.branch}`}
          />

          <TodayStatusCard activity={activity} score={score} totalSlots={totalSlots} />
          <ActivityWatch userId={user.id} role={user.role} />

          <PlanDailyStatus plan={plan} activity={activity} score={score} />
          <PrimaryActions />

          <NotesCard notes={notes} fromLabel={notesFrom} />

          {/* Section khusus per role (monitoring bawahan, dsb.) */}
          {typeof children === 'function' ? children({ user, nowKey }) : children}
        </div>
      )}
    </Layout>
  );
}
