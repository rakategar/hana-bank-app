import { supabase } from './supabase';
import { todayISO, currentWeekId } from './utils';
import { slotsForRole } from '../constants/timeSlots';

// ── RH LOGIN (USERNAME/PASSWORD) ─────────────────────────

export async function validateRHLogin(username, password) {
  const { data, error } = await supabase
    .from('rh_credentials')
    .select('*')
    .eq('username', username.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Username atau password salah.');

  // Simple comparison (passwords harus di-hash di production)
  if (data.password !== password) throw new Error('Username atau password salah.');

  // Fetch user profile (RH)
  const { data: rhUser, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user_id)
    .single();
  if (userError || !rhUser) throw new Error('RH user tidak ditemukan.');

  return rhUser;
}

// Initialize RH credentials (untuk demo)
export async function initializeRHCredentials() {
  try {
    // Cari RH user
    const { data: rhUsers, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'RH')
      .limit(1);

    if (fetchError || !rhUsers || rhUsers.length === 0) {
      throw new Error('RH user tidak ditemukan. Buat user RH terlebih dahulu di dashboard.');
    }

    const rhUserId = rhUsers[0].id;

    // Cek apakah credentials sudah ada
    const { data: existing } = await supabase
      .from('rh_credentials')
      .select('id')
      .eq('user_id', rhUserId);

    if (existing && existing.length > 0) {
      return { message: 'RH credentials sudah ada', count: existing.length };
    }

    // Insert 2 akun RH demo
    const credentials = [
      { username: 'primera', password: 'hanabanksinergia', user_id: rhUserId },
      { username: 'hana', password: 'headofregion', user_id: rhUserId },
    ];

    const { data, error } = await supabase
      .from('rh_credentials')
      .insert(credentials)
      .select();

    if (error) throw error;

    return {
      message: 'RH credentials berhasil dibuat',
      count: data?.length || 0,
      accounts: ['primera', 'hana']
    };
  } catch (err) {
    throw new Error(`Gagal initialize RH credentials: ${err.message}`);
  }
}

// ── USERS ─────────────────────────────────────────────────

export async function fetchAllUsers() {
  const { data, error } = await supabase.from('users').select('*').order('role');
  if (error) throw error;
  return data || [];
}

export async function fetchUser(userId) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

// Tidak error bila profil belum ada (dipakai untuk cek onboarding).
export async function fetchUserMaybe(userId) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchUsersByRole(role) {
  const { data, error } = await supabase.from('users').select('*').eq('role', role).order('name');
  if (error) throw error;
  return data || [];
}

// Buat / perbarui profil user (dipakai di onboarding). id = Clerk user id.
export async function upsertUserProfile({ id, name, role, branch, supervisorId }) {
  const payload = {
    id,
    name,
    role,
    branch: branch || null,
    supervisor_id: supervisorId || null,
  };
  const { data, error } = await supabase
    .from('users')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUser(userId, { name, role, branch, supervisorId }) {
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (role !== undefined) payload.role = role;
  if (branch !== undefined) payload.branch = branch || null;
  if (supervisorId !== undefined) payload.supervisor_id = supervisorId || null;
  const { data, error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUser(userId) {
  // Hapus data terkait dulu (foreign key constraints)
  await supabase.from('warnings').delete().eq('from_id', userId);
  await supabase.from('warnings').delete().eq('to_id', userId);
  await supabase.from('supervisor_summaries').delete().eq('supervisor_id', userId);
  await supabase.from('supervisor_summaries').delete().eq('target_user_id', userId);
  await supabase.from('ai_scores').delete().eq('user_id', userId);
  await supabase.from('extra_plans').delete().eq('user_id', userId);
  await supabase.from('daily_activities').delete().eq('user_id', userId);
  await supabase.from('weekly_plans').delete().eq('user_id', userId);
  // Null-out supervisor_id subordinat yang lapor ke user ini
  await supabase.from('users').update({ supervisor_id: null }).eq('supervisor_id', userId);
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) throw error;
}

export async function fetchSubordinates(supervisorId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('supervisor_id', supervisorId);
  if (error) throw error;
  return data || [];
}

// ── WEEKLY PLANS ──────────────────────────────────────────

export async function fetchWeeklyPlan(userId, weekId = currentWeekId()) {
  const { data, error } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('week_id', weekId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertWeeklyPlan({ userId, role, weekId = currentWeekId(), slots, submit }) {
  const payload = {
    user_id: userId,
    week_id: weekId,
    role,
    slots,
    updated_at: new Date().toISOString(),
  };
  if (submit) {
    payload.submitted_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from('weekly_plans')
    .upsert(payload, { onConflict: 'user_id,week_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWeeklyPlan(userId, weekId = currentWeekId()) {
  const { error } = await supabase
    .from('weekly_plans')
    .delete()
    .eq('user_id', userId)
    .eq('week_id', weekId);
  if (error) throw error;
}

// ── DAILY ACTIVITIES ──────────────────────────────────────

export async function fetchDailyActivity(userId, date = todayISO()) {
  const { data, error } = await supabase
    .from('daily_activities')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertDailyActivity({
  userId,
  role,
  date = todayISO(),
  activities,
  status = 'draft',
  isDummy = false,
  submit = false,
}) {
  const payload = {
    user_id: userId,
    role,
    date,
    activities,
    status,
    is_dummy: isDummy,
    updated_at: new Date().toISOString(),
  };
  if (submit) payload.submitted_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('daily_activities')
    .upsert(payload, { onConflict: 'user_id,date' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDailyData(userId, date = todayISO()) {
  const { error: e1 } = await supabase
    .from('ai_scores')
    .delete()
    .eq('user_id', userId)
    .eq('date', date);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from('daily_activities')
    .delete()
    .eq('user_id', userId)
    .eq('date', date);
  if (e2) throw e2;
}

// ── EXTRA PLANS (rencana tambahan & aksi terjadwal FWSS) ──

export async function fetchExtraPlans(userId, date = todayISO()) {
  const { data, error } = await supabase
    .from('extra_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('time');
  if (error) throw error;
  return data || [];
}

export async function createExtraPlan({ userId, role, date, time, endTime, label, data = {}, source = 'manual' }) {
  const { data: row, error } = await supabase
    .from('extra_plans')
    .insert({
      user_id: userId,
      role,
      date,
      time,
      end_time: endTime || null,
      label,
      data,
      source,
    })
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function deleteExtraPlan(id) {
  const { error } = await supabase.from('extra_plans').delete().eq('id', id);
  if (error) throw error;
}

// ── AI SCORES ─────────────────────────────────────────────

export async function fetchScore(userId, date = todayISO()) {
  const { data, error } = await supabase
    .from('ai_scores')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchScoreRange(userId, dates) {
  const { data, error } = await supabase
    .from('ai_scores')
    .select('date, daily_average, daily_level')
    .eq('user_id', userId)
    .in('date', dates);
  if (error) throw error;
  return data || [];
}

// Range aktivitas (untuk completion heatmap — tanpa membocorkan skor)
// Activities mentah untuk beberapa tanggal (matriks ActivityWatch per jam)
export async function fetchActivitiesForDates(userId, dates) {
  const { data, error } = await supabase
    .from('daily_activities')
    .select('date, activities')
    .eq('user_id', userId)
    .in('date', dates);
  if (error) throw error;
  return (data || []).map((row) => ({
    date: row.date,
    activities: Array.isArray(row.activities) ? row.activities : [],
  }));
}

export async function fetchActivityRange(userId, dates) {
  const { data, error } = await supabase
    .from('daily_activities')
    .select('date, activities')
    .eq('user_id', userId)
    .in('date', dates);
  if (error) throw error;
  return (data || []).map((row) => {
    const acts = Array.isArray(row.activities) ? row.activities : [];
    const total = acts.length || 0;
    const filled = acts.filter((a) => a.actual && a.actual.trim()).length;
    return { date: row.date, filled, total, ratio: total ? filled / total : 0 };
  });
}

export async function upsertScore({ userId, role, date = todayISO(), dailyActivityId, result, isDummy = false }) {
  const payload = {
    user_id: userId,
    role,
    date,
    daily_activity_id: dailyActivityId || null,
    is_dummy: isDummy,
    scores: result.scores || [],
    daily_average: result.daily_average ?? null,
    daily_level: result.daily_level ?? null,
    summary: result.summary ?? null,
    overall_recommendation: result.overall_recommendation ?? null,
    scored_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('ai_scores')
    .upsert(payload, { onConflict: 'user_id,date' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── SUPERVISOR SUMMARIES ──────────────────────────────────

export async function fetchSummaryFor({ supervisorId, targetUserId, date = todayISO() }) {
  const { data, error } = await supabase
    .from('supervisor_summaries')
    .select('*')
    .eq('supervisor_id', supervisorId)
    .eq('target_user_id', targetUserId)
    .eq('date', date)
    .eq('session_label', 'manual')
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Notes terbaru yang ditujukan ke target user (dari supervisornya)
export async function fetchNotesForUser(targetUserId, date = todayISO()) {
  const { data, error } = await supabase
    .from('supervisor_summaries')
    .select('*')
    .eq('target_user_id', targetUserId)
    .eq('date', date)
    .not('supervisor_notes', 'is', null)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).filter((s) => s.supervisor_notes && s.supervisor_notes.trim());
}

// Semua catatan & action plan yang pernah disimpan supervisor (arsip), lintas tanggal.
export async function fetchSummariesBySupervisor(supervisorId) {
  const { data, error } = await supabase
    .from('supervisor_summaries')
    .select('*')
    .eq('supervisor_id', supervisorId)
    .eq('session_label', 'manual')
    .order('date', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).filter(
    (s) => (s.supervisor_notes && s.supervisor_notes.trim()) || (Array.isArray(s.action_plans) && s.action_plans.length > 0)
  );
}

export async function upsertSummary({
  supervisorId,
  targetUserId,
  date = todayISO(),
  aiSummary,
  summaryData,
  supervisorNotes,
  actionPlans,
}) {
  const payload = {
    supervisor_id: supervisorId,
    target_user_id: targetUserId,
    date,
    session_label: 'manual',
    ai_summary: aiSummary ?? null,
    summary_data: summaryData ?? null,
    supervisor_notes: supervisorNotes ?? null,
    action_plans: actionPlans ?? [],
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('supervisor_summaries')
    .upsert(payload, { onConflict: 'supervisor_id,target_user_id,date,session_label' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── WARNINGS ──────────────────────────────────────────────

export async function fetchWarningsFor(userId) {
  const { data, error } = await supabase
    .from('warnings')
    .select('*')
    .eq('to_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchWarningsFrom(fromId) {
  const { data, error } = await supabase
    .from('warnings')
    .select('*')
    .eq('from_id', fromId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function sendWarnings({ fromId, toIds, title, message }) {
  const rows = toIds.map((to) => ({ from_id: fromId, to_id: to, title, message }));
  const { data, error } = await supabase.from('warnings').insert(rows).select();
  if (error) throw error;
  return data;
}

export async function markWarningRead(warningId) {
  const { error } = await supabase
    .from('warnings')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', warningId);
  if (error) throw error;
}

// ── COMPOSITE: data hari ini untuk satu user ──────────────

export async function fetchUserDaySnapshot(user, date = todayISO()) {
  const [activity, score] = await Promise.all([
    fetchDailyActivity(user.id, date),
    fetchScore(user.id, date),
  ]);
  const totalSlots = slotsForRole(user.role).length;
  const filled = activity?.activities?.filter((a) => a.actual && a.actual.trim()).length || 0;
  let inputStatus = 'belum'; // belum | draft | scored
  if (score) inputStatus = 'scored';
  else if (activity) inputStatus = 'draft';
  return { user, activity, score, totalSlots, filled, inputStatus };
}
