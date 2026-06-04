import { Plus, Trash2 } from 'lucide-react';
import { clsx } from '../lib/utils';

// Renderer form schema-driven. Dipakai di 3 tempat:
//  1. WeeklyPlan — mode edit untuk slot.data (rencana)
//  2. ActivitySlot panel atas — readOnly untuk slot.planned_data
//  3. ActivitySlot panel bawah — mode='actual' untuk slot.actual_data
//
// Props:
//  schema       : array field definition (lihat formSchemaFor di timeSlots.js)
//  value        : object nilai { key: value | [items] }
//  onChange     : (newValueObject) => void
//  users        : { supervisor, subordinates } untuk field user-select
//  readOnly     : true → tampilkan sebagai teks
//  disabled     : true → input dinonaktifkan
//  mode         : 'plan' (default) | 'actual'
//    actual mode: field list dengan resultSchema mengacu planned items (tidak bisa tambah/hapus)
//  plannedValue : object planned_data (dipakai di mode='actual' untuk list fields)

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function candidatesFor(field, users) {
  if (field.source === 'supervisor') return users?.supervisor ? [users.supervisor] : [];
  return users?.subordinates || [];
}

function userName(id, users) {
  const all = [users?.supervisor, ...(users?.subordinates || [])].filter(Boolean);
  const u = all.find((x) => x && x.id === id);
  return u ? u.name : id;
}

const INPUT_CLS = 'w-full px-3 py-2 text-sm disabled:bg-elevated disabled:cursor-not-allowed';

export default function SlotFormRenderer({
  schema = [],
  value = {},
  onChange,
  users,
  readOnly = false,
  disabled = false,
  mode = 'plan',
  plannedValue = {},
}) {
  const setField = (key, v) => onChange?.({ ...value, [key]: v });

  // ── READ-ONLY (tampilan rencana) ───────────────────────
  if (readOnly) {
    const filled = schema.filter((f) => {
      const v = value?.[f.key];
      return Array.isArray(v) ? v.length > 0 : v != null && v !== '';
    });
    if (filled.length === 0) {
      return <p className="text-xs text-text-muted italic">Belum ada rencana untuk slot ini.</p>;
    }
    return (
      <dl className="space-y-1.5">
        {filled.map((f) => (
          <div key={f.key} className="text-xs">
            <dt className="font-medium text-text-secondary">{f.label}</dt>
            <dd className="text-ink">{renderReadValue(f, value[f.key], users)}</dd>
          </div>
        ))}
      </dl>
    );
  }

  // ── EDITABLE ───────────────────────────────────────────
  return (
    <div className="grid gap-3">
      {schema.map((field) => {
        // Actual mode: list dengan resultSchema + ada planned items → ActualListField
        if (
          mode === 'actual' &&
          field.type === 'list' &&
          field.resultSchema?.length > 0 &&
          Array.isArray(plannedValue?.[field.key]) &&
          plannedValue[field.key].length > 0
        ) {
          return (
            <ActualListField
              key={field.key}
              field={field}
              value={value?.[field.key]}
              plannedItems={plannedValue[field.key]}
              onChange={(v) => setField(field.key, v)}
              users={users}
              disabled={disabled}
            />
          );
        }
        return (
          <FieldEditor
            key={field.key}
            field={field}
            value={value?.[field.key]}
            onChange={(v) => setField(field.key, v)}
            users={users}
            disabled={disabled}
          />
        );
      })}
    </div>
  );
}

function renderReadValue(field, v, users) {
  if (v == null || v === '') return '—';
  if (field.type === 'user-select') {
    if (field.multi) return (Array.isArray(v) ? v : []).map((id) => userName(id, users)).join(', ') || '—';
    return userName(v, users);
  }
  if (field.type === 'list') {
    const rows = Array.isArray(v) ? v : [];
    if (rows.length === 0) return '—';
    return (
      <ul className="mt-0.5 space-y-0.5">
        {rows.map((row, i) => (
          <li key={i} className="text-ink">
            ·{' '}
            {field.itemSchema
              .map((sub) => {
                const cell = row?.[sub.key];
                if (cell == null || cell === '') return null;
                return sub.type === 'user-select' ? userName(cell, users) : cell;
              })
              .filter(Boolean)
              .join(' — ')}
          </li>
        ))}
      </ul>
    );
  }
  return String(v);
}

// Editor untuk satu field (list ditangani sendiri)
function FieldEditor({ field, value, onChange, users, disabled }) {
  if (field.type === 'list') {
    return <ListField field={field} value={value} onChange={onChange} users={users} disabled={disabled} />;
  }
  return (
    <div>
      <label className="label">{field.label}</label>
      <InputControl field={field} value={value} onChange={onChange} users={users} disabled={disabled} />
    </div>
  );
}

function InputControl({ field, value, onChange, users, disabled }) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          rows={field.rows || 2}
          disabled={disabled}
          className={clsx(INPUT_CLS, 'resize-y')}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
        />
      );
    case 'number':
      return (
        <input
          type="number"
          min={field.min ?? 0}
          max={field.max}
          disabled={disabled}
          className={INPUT_CLS}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={field.placeholder || ''}
        />
      );
    case 'select':
      return (
        <select disabled={disabled} className={INPUT_CLS} value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— pilih —</option>
          {field.options.map((o) => (
            <option key={o} value={o}>{cap(o)}</option>
          ))}
        </select>
      );
    case 'user-select':
      return <UserSelect field={field} value={value} onChange={onChange} users={users} disabled={disabled} />;
    case 'text':
    default:
      return (
        <input
          type="text"
          disabled={disabled}
          className={INPUT_CLS}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
        />
      );
  }
}

function UserSelect({ field, value, onChange, users, disabled }) {
  const cands = candidatesFor(field, users);

  if (cands.length === 0) {
    return (
      <p className="text-[11px] text-text-muted italic px-3 py-2 rounded-lg border border-dashed border-hana-border">
        Belum ada {field.source === 'supervisor' ? 'atasan' : 'bawahan'} terdaftar.
      </p>
    );
  }

  if (field.multi) {
    const sel = Array.isArray(value) ? value : [];
    const toggle = (id) => onChange(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
    return (
      <div className="flex flex-wrap gap-1.5">
        {cands.map((c) => {
          const active = sel.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(c.id)}
              className={clsx(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                active ? 'bg-hana-teal-500 text-white border-hana-teal-500' : 'bg-white text-text-secondary border-hana-border hover:border-hana-teal-500'
              )}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <select disabled={disabled} className={INPUT_CLS} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">— pilih —</option>
      {cands.map((c) => (
        <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
      ))}
    </select>
  );
}

// List field editable penuh (mode plan — boleh tambah/hapus baris)
function ListField({ field, value, onChange, users, disabled }) {
  const rows = Array.isArray(value) ? value : [];

  const blankRow = () => Object.fromEntries(field.itemSchema.map((s) => [s.key, s.type === 'user-select' && s.multi ? [] : '']));
  const addRow = () => onChange([...rows, blankRow()]);
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const updateCell = (i, key, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));

  return (
    <div>
      <label className="label">{field.label}</label>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="rounded-lg border border-hana-border bg-elevated/50 p-2.5 relative">
            <div className="grid gap-2">
              {field.itemSchema.map((sub) => (
                <div key={sub.key}>
                  <label className="block text-[10px] font-medium text-text-muted mb-0.5">{sub.label}</label>
                  <InputControl field={sub} value={row?.[sub.key]} onChange={(v) => updateCell(i, sub.key, v)} users={users} disabled={disabled} />
                </div>
              ))}
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="absolute top-2 right-2 text-score-1 hover:bg-score-1/10 rounded p-1"
                title="Hapus baris"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-hana-teal-700 hover:text-hana-teal-500 px-2 py-1"
          >
            <Plus size={14} /> {field.addLabel}
          </button>
        )}
        {rows.length === 0 && disabled && <p className="text-xs text-text-muted italic">—</p>}
      </div>
    </div>
  );
}

// Actual mode: list field yang mereferensi planned items — tidak bisa tambah/hapus
// Tiap planned item tampil sebagai kartu: atas read-only (planned), bawah editable (result)
function ActualListField({ field, value, plannedItems, onChange, users, disabled }) {
  const rows = Array.isArray(value) && value.length === plannedItems.length
    ? value
    : plannedItems.map((item, i) => {
        const existing = Array.isArray(value) ? value[i] : null;
        return { ...item, ...(existing || {}) };
      });

  const updateResult = (i, key, v) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, [key]: v } : r));
    onChange(next);
  };

  return (
    <div>
      <label className="label">{field.label}</label>
      {rows.length === 0 ? (
        <p className="text-xs text-text-muted italic">Tidak ada item yang direncanakan.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="rounded-lg border border-hana-border overflow-hidden">
              {/* Planned item (read-only) */}
              <div className="bg-elevated/70 px-3 py-2 border-b border-hana-border">
                <p className="text-[10px] font-semibold text-text-muted mb-1">Rencana #{i + 1}</p>
                <p className="text-xs text-ink">
                  {field.itemSchema
                    .map((sub) => {
                      const cell = row?.[sub.key];
                      if (cell == null || cell === '') return null;
                      const display = sub.type === 'user-select' ? userName(cell, users) : cell;
                      return `${sub.label}: ${display}`;
                    })
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {/* Result fields (editable) */}
              <div className="p-2.5 grid gap-2">
                {field.resultSchema.map((sub) => (
                  <div key={sub.key}>
                    <label className="block text-[10px] font-medium text-text-muted mb-0.5">{sub.label}</label>
                    <InputControl
                      field={sub}
                      value={row?.[sub.key]}
                      onChange={(v) => updateResult(i, sub.key, v)}
                      users={users}
                      disabled={disabled}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
