import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardList, PencilLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNowKey } from '../../hooks/useNowKey';
import { useSalesDashboard } from '../../hooks/useSalesDashboard';
import Layout from '../../components/Layout';
import ActivityWatch from '../../components/ActivityWatch';
import WarningBanner from '../../components/WarningBanner';
import { DashboardIntro, NotesCard } from '../../components/dashboard';
import { DashboardSkeleton } from '../../components/ui';
import { slotsForRole } from '../../constants/timeSlots';
import { ROLE_LABELS, getFirstName, isStructuredFilled, clsx } from '../../lib/utils';

function FAStatCard({ label, value, helper, icon: Icon, tone = 'default' }) {
  const danger = tone === 'danger';
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-card backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        <span className={clsx('grid h-9 w-9 place-items-center rounded-xl', danger ? 'bg-score-1/10 text-score-1' : 'bg-hana-teal-50 text-hana-teal-700')}>
          <Icon size={17} />
        </span>
      </div>
      <p className={clsx('font-display text-3xl font-extrabold leading-none', danger ? 'text-score-1' : 'text-ink')}>{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-text-secondary">{helper}</p>
    </div>
  );
}

function PrimaryWorkActions({ onWeeklyPlan, onDailyInput }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button onClick={onWeeklyPlan} className="btn-teal min-h-12 w-full">
        <ClipboardList size={18} /> Buat Rencana Minggu Ini
      </button>
      <button onClick={onDailyInput} className="btn-pink min-h-12 w-full">
        <PencilLine size={18} /> Input Aktivitas Hari Ini
      </button>
    </div>
  );
}

export default function FADashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nowKey = useNowKey();
  const { loading, error, plan, activity, score, warnings, notes, reload } = useSalesDashboard(user, nowKey);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const totalSlots = slotsForRole(user.role).length;
  const activities = Array.isArray(activity?.activities) ? activity.activities : [];
  const filledSlots = activities.filter((slot) => {
    if (slot.actual?.trim()) return true;
    if (isStructuredFilled(slot.actual_data)) return true;
    if (slot.notes?.trim()) return true;
    return slot.activity_status === 'done' || slot.activity_status === 'partial';
  }).length;
  const dailyStatus = score ? 'scored' : activity ? 'draft' : 'belum';
  const planSubmitted = Boolean(plan?.submitted_at);
  const unreadCount = warnings.filter((warning) => !warning.is_read).length;
  const roleLabel = ROLE_LABELS[user.role] || user.role;

  return (
    <Layout title="Dashboard FA" unreadCount={unreadCount}>
      {loading ? (
        <DashboardSkeleton stats={3} showTabs={false} />
      ) : (
        <div className="space-y-6">
          <WarningBanner warnings={warnings} onRead={reload} />

          <DashboardIntro
            title={`Halo, ${getFirstName(user.name)}`}
            subtitle={`${roleLabel} - ${user.branch}`}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <FAStatCard
              label="Rencana Mingguan"
              value={planSubmitted ? 'OK' : 'Draft'}
              helper={planSubmitted ? 'Rencana minggu ini sudah disubmit.' : 'Lengkapi dan submit rencana minggu ini.'}
              icon={CalendarDays}
              tone={planSubmitted ? 'default' : 'danger'}
            />
            <FAStatCard
              label="Slot Terisi"
              value={`${filledSlots}/${totalSlots}`}
              helper="Progress input aktivitas hari ini."
              icon={CheckCircle2}
            />
            <FAStatCard
              label="Status Input"
              value={dailyStatus === 'scored' ? 'Scored' : dailyStatus === 'draft' ? 'Draft' : 'Belum'}
              helper={dailyStatus === 'scored' ? 'Aktivitas sudah dinilai.' : dailyStatus === 'draft' ? 'Draft aktivitas tersimpan.' : 'Belum ada input hari ini.'}
              icon={PencilLine}
              tone={dailyStatus === 'belum' ? 'danger' : 'default'}
            />
          </div>

          <PrimaryWorkActions
            onWeeklyPlan={() => navigate('/weekly-plan')}
            onDailyInput={() => navigate('/daily-input')}
          />

          <ActivityWatch userId={user.id} role={user.role} />

          {notes.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Catatan dari FWSS</p>
              <NotesCard notes={notes} fromLabel="FWSS" />
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
