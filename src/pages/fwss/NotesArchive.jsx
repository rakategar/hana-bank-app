import { useEffect, useMemo, useState } from 'react';
import { FolderClock, CalendarClock, CheckCircle2, StickyNote, Search, X, ClipboardList, UsersRound } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import { Select, Avatar, Modal, Pagination } from '../../components/ui';
import { fetchSummariesBySupervisor, fetchSubordinates } from '../../lib/db';
import { formatDateID, clsx } from '../../lib/utils';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua Action' },
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'unscheduled', label: 'Belum Terjadwal' },
];

function ArchiveStat({ label, value, helper, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-card backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-hana-teal-50 text-hana-teal-700">
          <Icon size={17} />
        </span>
      </div>
      <p className="font-display text-3xl font-extrabold leading-none text-ink">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-text-secondary">{helper}</p>
    </div>
  );
}

function NotesArchiveSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="skeleton h-8 w-56" />
          <div className="skeleton h-4 w-80 max-w-full" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="card space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-9 w-9 rounded-xl" />
            </div>
            <div className="skeleton h-8 w-16" />
            <div className="skeleton h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="card !p-0 overflow-hidden">
        <div className="border-b border-hana-border px-4 py-4 sm:px-6">
          <div className="skeleton h-5 w-40" />
          <div className="mt-2 skeleton h-3 w-72" />
        </div>
        <div className="space-y-3 p-4 sm:p-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-hana-border/70 bg-white/80 p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="skeleton h-9 w-9 rounded-full" />
                <div className="space-y-1.5">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-3 w-24" />
                </div>
              </div>
              <div className="skeleton h-16 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NotesArchive() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [namesById, setNamesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [detailRow, setDetailRow] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const [summaries, subs] = await Promise.all([
          fetchSummariesBySupervisor(user.id),
          fetchSubordinates(user.id),
        ]);
        setRows(summaries);
        setNamesById(Object.fromEntries(subs.map((sub) => [sub.id, sub.name])));
      } catch (e) {
        toast.error(e.message || 'Gagal memuat arsip.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const actionCount = rows.reduce((sum, row) => sum + (Array.isArray(row.action_plans) ? row.action_plans.length : 0), 0);
  const scheduledCount = rows.reduce(
    (sum, row) => sum + (Array.isArray(row.action_plans) ? row.action_plans.filter((action) => action.schedule?.date).length : 0),
    0
  );
  const uniqueTargets = new Set(rows.map((row) => row.target_user_id)).size;

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const targetName = namesById[row.target_user_id] || row.target_user_id || '';
      const notes = row.supervisor_notes || '';
      const actions = Array.isArray(row.action_plans) ? row.action_plans : [];

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const actionMatch = actions.some((action) => action.label?.toLowerCase().includes(q));
        const nameMatch = targetName.toLowerCase().includes(q);
        const noteMatch = notes.toLowerCase().includes(q);
        if (!actionMatch && !nameMatch && !noteMatch) return false;
      }

      if (statusFilter === 'scheduled' && !actions.some((action) => action.schedule?.date)) return false;
      if (statusFilter === 'unscheduled' && !actions.some((action) => !action.schedule?.date)) return false;

      return true;
    });
  }, [rows, namesById, searchQuery, statusFilter]);

  const rowsPerPage = 8;
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const paginatedRows = filteredRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <Layout title="Arsip Catatan">
      {loading ? (
        <NotesArchiveSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">Arsip Catatan FA</h2>
              <p className="mt-1 text-sm text-text-secondary">Riwayat notes dan action plan yang tersimpan dari Summary FA.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <ArchiveStat label="Total Catatan" value={rows.length} helper="Summary FA yang tersimpan." icon={StickyNote} />
            <ArchiveStat label="Action Plan" value={actionCount} helper={`${scheduledCount} sudah dijadwalkan.`} icon={ClipboardList} />
            <ArchiveStat label="FA Terkait" value={uniqueTargets} helper="Financial Advisor dengan catatan." icon={UsersRound} />
          </div>

          <div className="card !p-0 overflow-hidden">
            <div className="border-b border-hana-border px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-display text-lg font-extrabold text-ink">Daftar Catatan</p>
                  <p className="text-xs text-text-muted">Dikelompokkan berdasarkan tanggal pembuatan summary.</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Cari nama, catatan, atau action plan..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full py-2 pl-9 pr-4 text-xs"
                  />
                  <span className="absolute left-3 top-2.5 text-text-muted">
                    <Search size={14} />
                  </span>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-text-muted hover:text-ink"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} className="w-48 sm:w-56" />
              </div>
            </div>

            <div className="overflow-x-auto px-4 py-2 sm:px-6">
              {filteredRows.length === 0 ? (
                <div className="py-12 text-center">
                  <FolderClock size={36} className="mx-auto mb-3 text-text-muted" />
                  <p className="font-display text-lg font-extrabold text-ink">Belum ada catatan ditemukan</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Catatan dan action plan yang Anda simpan di Summary FA akan terkumpul di sini.
                  </p>
                </div>
              ) : (
                <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-text-muted">
                      <th className="py-1.5 pl-6 pr-4 font-semibold">Tanggal</th>
                      <th className="px-4 py-1.5 font-semibold">FA</th>
                      <th className="px-4 py-1.5 font-semibold">Notes</th>
                      <th className="px-4 py-1.5 font-semibold">Action Plan</th>
                      <th className="py-1.5 pl-4 pr-6 font-semibold">Jadwal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => {
                      const actions = Array.isArray(row.action_plans) ? row.action_plans : [];
                      const scheduled = actions.filter((action) => action.schedule?.date);
                      return (
                        <tr key={row.id} onClick={() => setDetailRow(row)} className="cursor-pointer transition-all">
                          <td className="rounded-l-2xl border-y border-l border-hana-border/30 bg-white py-4 pl-6 pr-4 align-top">
                            <div className="flex items-center gap-2">
                              <span className="grid h-8 w-8 place-items-center rounded-xl bg-hana-teal-50 text-hana-teal-700">
                                <CalendarClock size={15} />
                              </span>
                              <div>
                                <p className="font-bold text-ink">{formatDateID(row.date)}</p>
                                <p className="text-[10px] text-text-muted">Summary FA</p>
                              </div>
                            </div>
                          </td>

                          <td className="border-y border-hana-border/30 bg-white px-4 py-4 align-top">
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar name={namesById[row.target_user_id] || row.target_user_id} />
                              <div className="min-w-0">
                                <p className="truncate font-bold text-ink">{namesById[row.target_user_id] || row.target_user_id}</p>
                                <p className="text-xs text-text-muted">Financial Advisor</p>
                              </div>
                            </div>
                          </td>

                          <td className="border-y border-hana-border/30 bg-white px-4 py-4 align-top">
                            {row.supervisor_notes?.trim() ? (
                              <p className="line-clamp-4 max-w-xs whitespace-pre-wrap text-xs leading-relaxed text-text-secondary">
                                {row.supervisor_notes}
                              </p>
                            ) : (
                              <span className="text-xs italic text-text-muted">Tidak ada notes</span>
                            )}
                          </td>

                          <td className="border-y border-hana-border/30 bg-white px-4 py-4 align-top">
                            {actions.length > 0 ? (
                              <div className="space-y-2">
                                {actions.map((action) => {
                                  const isScheduled = Boolean(action.schedule?.date);
                                  return (
                                    <div key={action.id} className="flex items-start gap-2 text-xs text-ink">
                                      <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', isScheduled ? 'bg-score-4' : 'bg-hana-teal-500')} />
                                      <span className="max-w-xs leading-relaxed">{action.label}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs italic text-text-muted">Tidak ada action plan</span>
                            )}
                          </td>

                          <td className="rounded-r-2xl border-y border-r border-hana-border/30 bg-white py-4 pl-4 pr-6 align-top">
                            {scheduled.length > 0 ? (
                              <div className="flex flex-col gap-1.5">
                                {scheduled.map((action) => (
                                  <span key={action.id} className={clsx('inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold', action.schedule.extra_plan_id ? 'bg-score-4/15 text-score-4' : 'bg-hana-teal-50 text-hana-teal-700')}>
                                    {action.schedule.extra_plan_id ? <CheckCircle2 size={11} /> : <CalendarClock size={11} />}
                                    {action.schedule.date} - {action.schedule.time}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="badge-neutral">Belum terjadwal</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={filteredRows.length}
              itemsPerPage={rowsPerPage}
            />
          </div>
        </div>
      )}

      <Modal
        open={Boolean(detailRow)}
        onClose={() => setDetailRow(null)}
        title="Detail Catatan"
        maxWidth="max-w-xl"
      >
        {detailRow && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-2xl border border-hana-border/70 bg-elevated/50 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={namesById[detailRow.target_user_id] || detailRow.target_user_id} />
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink">{namesById[detailRow.target_user_id] || detailRow.target_user_id}</p>
                  <p className="text-xs text-text-muted">Financial Advisor</p>
                </div>
              </div>
              <span className="badge-neutral shrink-0">{formatDateID(detailRow.date)}</span>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-secondary">
                <StickyNote size={13} /> Notes
              </p>
              {detailRow.supervisor_notes?.trim() ? (
                <div className="rounded-2xl border border-hana-border/70 bg-white/80 p-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{detailRow.supervisor_notes}</p>
                </div>
              ) : (
                <p className="text-sm italic text-text-muted">Tidak ada notes.</p>
              )}
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text-secondary">Action Plan</p>
              {Array.isArray(detailRow.action_plans) && detailRow.action_plans.length > 0 ? (
                <ul className="space-y-2">
                  {detailRow.action_plans.map((action) => {
                    const scheduled = Boolean(action.schedule?.date);
                    return (
                      <li key={action.id} className="rounded-2xl border border-hana-border/70 bg-white/80 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <span className="flex items-start gap-2 text-sm text-ink">
                            <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', scheduled ? 'bg-score-4' : 'bg-hana-teal-500')} />
                            <span>{action.label}</span>
                          </span>
                          {scheduled ? (
                            <span className={clsx('inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold', action.schedule.extra_plan_id ? 'bg-score-4/15 text-score-4' : 'bg-hana-teal-50 text-hana-teal-700')}>
                              {action.schedule.extra_plan_id ? <CheckCircle2 size={11} /> : <CalendarClock size={11} />}
                              {action.schedule.date} - {action.schedule.time}
                            </span>
                          ) : (
                            <span className="badge-neutral w-fit">Belum terjadwal</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm italic text-text-muted">Tidak ada action plan.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
