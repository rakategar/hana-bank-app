import { useEffect, useState, useCallback } from 'react';
import {
  fetchWeeklyPlan,
  fetchDailyActivity,
  fetchScore,
  fetchActivityRange,
  fetchWarningsFor,
  fetchNotesForUser,
} from '../lib/db';
import { lastNDates, currentWeekId } from '../lib/utils';

// Data umum dashboard FA/FWSS/BM untuk user yang login.
// Catatan: skor sendiri TIDAK ditampilkan (privasi) — heatmap pakai data penyelesaian.
export function useSalesDashboard(user) {
  const [state, setState] = useState({
    loading: true,
    error: '',
    plan: null,
    activity: null,
    score: null,
    completion: [],
    warnings: [],
    notes: [],
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const [plan, activity, score, completion, warnings, notes] = await Promise.all([
        fetchWeeklyPlan(user.id, currentWeekId()),
        fetchDailyActivity(user.id),
        fetchScore(user.id),
        fetchActivityRange(user.id, lastNDates(10)),
        fetchWarningsFor(user.id),
        fetchNotesForUser(user.id),
      ]);
      setState({ loading: false, error: '', plan, activity, score, completion, warnings, notes });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message || 'Gagal memuat data dashboard.' }));
    }
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
