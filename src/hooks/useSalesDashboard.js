import { useEffect, useState, useCallback } from 'react';
import {
  fetchWeeklyPlan,
  fetchDailyActivity,
  fetchScore,
  fetchWarningsFor,
  fetchNotesForUser,
} from '../lib/db';
import { currentWeekId } from '../lib/utils';

// Data umum dashboard FA/FWSS/BM untuk user yang login.
// Catatan: skor sendiri TIDAK ditampilkan (privasi).
// `nowKey` (mode demo) memicu reload saat waktu demo diubah.
export function useSalesDashboard(user, nowKey = 0) {
  const [state, setState] = useState({
    loading: true,
    error: '',
    plan: null,
    activity: null,
    score: null,
    warnings: [],
    notes: [],
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const [plan, activity, score, warnings, notes] = await Promise.all([
        fetchWeeklyPlan(user.id, currentWeekId()),
        fetchDailyActivity(user.id),
        fetchScore(user.id),
        fetchWarningsFor(user.id),
        fetchNotesForUser(user.id),
      ]);
      setState({ loading: false, error: '', plan, activity, score, warnings, notes });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message || 'Gagal memuat data dashboard.' }));
    }
  }, [user.id, nowKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
