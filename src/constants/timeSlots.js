// Template 12 time slot per role (dari PDF program ICU Class)

export const FA_SLOTS = [
  { time: '07:30', label: 'Morning Briefing & Target Commitment' },
  { time: '08:00', label: 'Pipeline Review & Prioritas Nasabah' },
  { time: '09:00', label: 'Tele-Appointment & Customer Engagement' },
  { time: '10:00', label: 'Prospecting & Referral Sourcing' },
  { time: '11:00', label: 'Customer Meeting & Product Presentation' },
  { time: '12:00', label: 'Persiapan Meeting & Kelengkapan Aplikasi' },
  { time: '13:00', label: 'Midday Checkpoint & Recovery Action' },
  { time: '14:00', label: 'Customer Meeting & Advisory Session' },
  { time: '15:00', label: 'Closing Follow Up & Objection Handling' },
  { time: '16:00', label: 'Update CRM & Submit Activity' },
  { time: '17:00', label: 'Sales Coaching & Skill Practice' },
  { time: '18:00', label: 'Evening Review & Pipeline Lock Besok' },
];

export const FWSS_SLOTS = [
  { time: '07:30', label: 'Daily Recovery Direction & Target Lock' },
  { time: '08:00', label: 'Pipeline Control & FA Monitoring' },
  { time: '09:00', label: 'Morning Activation & Sales Recovery' },
  { time: '10:00', label: 'Branch Opportunity & Lead Activation' },
  { time: '11:00', label: 'Case Review & Solution Discussion' },
  { time: '12:00', label: 'Recovery Coaching & Result Enforcement' },
  { time: '13:00', label: 'Joint Meeting & Assisted Closing' },
  { time: '14:00', label: 'Midday Monitoring & Recovery Intervention' },
  { time: '15:00', label: 'Closing Push & Conversion Acceleration' },
  { time: '16:00', label: 'CRM Monitoring & Activity Discipline' },
  { time: '17:00', label: 'Sales Clinic & Recovery Reinforcement' },
  { time: '18:00', label: 'End Day Accountability & Direction' },
];

export const BM_SLOTS = [
  { time: '07:30', label: 'Business Direction & Daily Alignment' },
  { time: '08:00', label: 'Pipeline Monitoring & Priority Support' },
  { time: '09:00', label: 'Morning Support & Team Reinforcement' },
  { time: '10:00', label: 'Branch Coordination & Business Opportunity' },
  { time: '11:00', label: 'Support High Potential Customer Case' },
  { time: '12:00', label: 'Business Reinforcement & Team Support' },
  { time: '13:00', label: 'Joint Meeting & Closing Support' },
  { time: '14:00', label: 'Midday Monitoring & Recovery Support' },
  { time: '15:00', label: 'Escalation Support & Closing Assistance' },
  { time: '16:00', label: 'CRM Monitoring & Activity Validation' },
  { time: '17:00', label: 'Business Review & Team Reinforcement' },
  { time: '18:00', label: 'End Day Review & Planning Besok' },
];

export function slotsForRole(role) {
  switch (role) {
    case 'FWSS':
      return FWSS_SLOTS;
    case 'BM':
      return BM_SLOTS;
    case 'FA':
    default:
      return FA_SLOTS;
  }
}

// ── Helper penjadwalan per-hari (Senin–Jumat) ─────────────
import { WEEKDAYS, DEFAULT_DURATION } from '../lib/utils';

export function emptyDaySlots(role) {
  return slotsForRole(role).map((t) => ({
    time: t.time,
    label: t.label,
    prospect: '',
    location: '',
    objective: '',
    duration: DEFAULT_DURATION,
  }));
}

export function emptyPlanByDay(role) {
  const out = {};
  WEEKDAYS.forEach((w) => {
    out[w.key] = emptyDaySlots(role);
  });
  return out;
}

// Normalisasi slots dari DB ke struktur { monday:[...], ... }.
// Format lama (array) diabaikan agar mulai bersih.
export function normalizePlanByDay(slots, role) {
  const base = emptyPlanByDay(role);
  if (slots && !Array.isArray(slots) && typeof slots === 'object') {
    WEEKDAYS.forEach((w) => {
      const day = slots[w.key];
      if (Array.isArray(day)) {
        const byTime = new Map(day.map((s) => [s.time, s]));
        base[w.key] = base[w.key].map((t) => ({ ...t, ...(byTime.get(t.time) || {}) }));
      }
    });
  }
  return base;
}
