import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Search, Trash2, X } from 'lucide-react';
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

const INPUT_CLS = 'w-full rounded-xl border-hana-border bg-white/95 px-3.5 py-2.5 text-sm text-ink shadow-sm placeholder:text-text-muted/75 focus:border-hana-teal-500 focus:bg-white disabled:bg-elevated disabled:text-text-muted disabled:cursor-not-allowed';
const USER_RESULT_LIMIT = 8;

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
      <dl className="space-y-2">
        {filled.map((f) => (
          <div key={f.key} className="rounded-xl border border-hana-border/70 bg-white/70 px-3 py-2 text-xs">
            <dt className="font-semibold text-text-secondary">{f.label}</dt>
            <dd className="mt-0.5 text-ink">{renderReadValue(f, value[f.key], users)}</dd>
          </div>
        ))}
      </dl>
    );
  }

  // ── ACTUAL MODE ────────────────────────────────────────
  // Hanya field list ber-resultSchema yang dirender (mengisi hasil per item rencana).
  // Field non-list TIDAK dirender — rencananya sudah tampil read-only di panel "Rencana".
  if (mode === 'actual') {
    const resultFields = schema.filter((f) => f.type === 'list' && f.resultSchema?.length > 0);
    if (resultFields.length === 0) return null;
    return (
      <div className="grid gap-3">
        {resultFields.map((field) => {
          const plannedItems = Array.isArray(plannedValue?.[field.key]) ? plannedValue[field.key] : [];
          if (plannedItems.length === 0) {
            return (
              <div key={field.key}>
                <label className="label">{field.label}</label>
                <p className="text-xs text-text-muted italic">Tidak ada {field.label.toLowerCase()} yang direncanakan.</p>
              </div>
            );
          }
          return (
            <ActualListField
              key={field.key}
              field={field}
              value={value?.[field.key]}
              plannedItems={plannedItems}
              onChange={(v) => setField(field.key, v)}
              users={users}
              disabled={disabled}
            />
          );
        })}
      </div>
    );
  }

  // ── EDITABLE (plan mode) ───────────────────────────────
  return (
    <div className="grid gap-3">
      {schema.map((field) => (
        <FieldEditor
          key={field.key}
          field={field}
          value={value?.[field.key]}
          onChange={(v) => setField(field.key, v)}
          users={users}
          disabled={disabled}
        />
      ))}
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
    <div className="space-y-1.5">
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
          className={clsx(INPUT_CLS, 'min-h-[92px] resize-y leading-relaxed')}
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
      <p className="rounded-xl border border-dashed border-hana-border bg-elevated/50 px-3 py-2 text-[11px] italic text-text-muted">
        Belum ada {field.source === 'supervisor' ? 'atasan' : 'bawahan'} terdaftar.
      </p>
    );
  }

  return (
    <UserCombobox
      options={cands}
      value={value}
      onChange={onChange}
      disabled={disabled}
      multi={field.multi}
      placeholder={`Cari ${field.source === 'supervisor' ? 'atasan' : 'bawahan'}...`}
    />
  );

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
function userSearchText(user) {
  return [user?.name, user?.role, user?.branch, user?.id].filter(Boolean).join(' ').toLowerCase();
}

function UserAvatar({ user, selected }) {
  const initials = (user?.name || user?.role || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <span className={clsx('grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[11px] font-extrabold', selected ? 'bg-hana-teal-600 text-white' : 'bg-hana-teal-50 text-hana-teal-700')}>
      {initials}
    </span>
  );
}

function UserCombobox({ options, value, onChange, disabled, multi = false, placeholder = 'Cari user...' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const selectedIds = multi ? (Array.isArray(value) ? value : []) : (value ? [value] : []);
  const selectedUsers = selectedIds.map((id) => options.find((user) => user.id === id)).filter(Boolean);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredOptions = useMemo(() => {
    const selected = new Set(selectedIds);
    return options
      .filter((user) => !multi || !selected.has(user.id))
      .filter((user) => !normalizedQuery || userSearchText(user).includes(normalizedQuery))
      .slice(0, USER_RESULT_LIMIT);
  }, [multi, normalizedQuery, options, selectedIds]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current || rootRef.current.contains(event.target)) return;
      setOpen(false);
      setQuery('');
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  function selectUser(user) {
    if (disabled) return;
    if (multi) {
      onChange([...selectedIds, user.id]);
      setQuery('');
      setOpen(true);
      return;
    }

    onChange(user.id);
    setQuery('');
    setOpen(false);
  }

  function removeUser(id) {
    if (disabled) return;
    if (multi) onChange(selectedIds.filter((selectedId) => selectedId !== id));
    else onChange('');
  }

  const singleSelected = !multi ? selectedUsers[0] : null;

  return (
    <div ref={rootRef} className="relative">
      <div
        className={clsx(
          'min-h-[44px] rounded-xl border border-hana-border bg-white/95 px-3 py-2 shadow-sm transition-colors',
          open && 'border-hana-teal-500 bg-white',
          disabled && 'cursor-not-allowed bg-elevated text-text-muted'
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Search size={15} className="shrink-0 text-text-muted" />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {multi && selectedUsers.map((user) => (
              <span key={user.id} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-hana-teal-100 bg-hana-teal-50 px-2 py-1 text-xs font-semibold text-hana-teal-700">
                <span className="max-w-[140px] truncate">{user.name}</span>
                <button type="button" onClick={() => removeUser(user.id)} disabled={disabled} className="rounded-full p-0.5 hover:bg-hana-teal-100">
                  <X size={12} />
                </button>
              </span>
            ))}

            {!multi && singleSelected && !open ? (
              <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="min-w-0 flex-1 text-left text-sm font-semibold text-ink">
                <span className="block truncate">{singleSelected.name}</span>
              </button>
            ) : (
              <input
                type="text"
                disabled={disabled}
                value={query}
                onFocus={() => setOpen(true)}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setOpen(true);
                }}
                placeholder={singleSelected ? singleSelected.name : placeholder}
                className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm shadow-none placeholder:text-text-muted/80 focus:border-0 focus:bg-transparent"
              />
            )}
          </div>

          {singleSelected && !disabled && (
            <button type="button" onClick={() => removeUser(singleSelected.id)} className="shrink-0 rounded-lg p-1 text-text-muted hover:bg-elevated hover:text-ink">
              <X size={14} />
            </button>
          )}
          <button type="button" disabled={disabled} onClick={() => setOpen((next) => !next)} className="shrink-0 rounded-lg p-1 text-text-muted hover:bg-elevated hover:text-ink disabled:cursor-not-allowed">
            <ChevronDown size={15} className={clsx('transition-transform', open && 'rotate-180')} />
          </button>
        </div>
      </div>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-2xl border border-hana-border bg-white shadow-float">
          {filteredOptions.length > 0 ? (
            <div className="max-h-72 overflow-y-auto p-1.5">
              {filteredOptions.map((user) => {
                const selected = selectedIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => selectUser(user)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-hana-teal-50"
                  >
                    <UserAvatar user={user} selected={selected} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">{user.name}</span>
                      <span className="block truncate text-xs text-text-muted">{user.role}{user.branch ? ` - ${user.branch}` : ''}</span>
                    </span>
                    {selected && <Check size={16} className="shrink-0 text-hana-teal-600" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-4 text-center text-xs text-text-muted">Tidak ada user yang cocok.</div>
          )}
          {options.length > USER_RESULT_LIMIT && (
            <div className="border-t border-hana-border bg-elevated/60 px-3 py-2 text-[11px] text-text-muted">
              Tampilkan {filteredOptions.length} dari {options.length} user. Ketik nama atau cabang untuk mencari.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ListField({ field, value, onChange, users, disabled }) {
  const rows = Array.isArray(value) ? value : [];

  const blankRow = () => Object.fromEntries(field.itemSchema.map((s) => [s.key, s.type === 'user-select' && s.multi ? [] : '']));
  const addRow = () => onChange([...rows, blankRow()]);
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const updateCell = (i, key, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));

  return (
    <div className="space-y-1.5">
      <label className="label">{field.label}</label>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="relative rounded-2xl border border-hana-border/80 bg-white/80 p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Item {i + 1}</p>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="rounded-lg p-1.5 text-score-1 transition-colors hover:bg-score-1/10"
                  title="Hapus baris"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid gap-2.5">
              {field.itemSchema.map((sub) => (
                <div key={sub.key} className="space-y-1">
                  <label className="block text-[10px] font-semibold text-text-muted">{sub.label}</label>
                  <InputControl field={sub} value={row?.[sub.key]} onChange={(v) => updateCell(i, sub.key, v)} users={users} disabled={disabled} />
                </div>
              ))}
            </div>
          </div>
        ))}
        {!disabled && (
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-hana-teal-200 bg-hana-teal-50/60 px-3 py-2 text-xs font-bold text-hana-teal-700 transition-colors hover:border-hana-teal-300 hover:bg-hana-teal-50"
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
    <div className="space-y-1.5">
      <label className="label">{field.label}</label>
      {rows.length === 0 ? (
        <p className="text-xs text-text-muted italic">Tidak ada item yang direncanakan.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-hana-border/80 bg-white/80 shadow-sm">
              {/* Planned item (read-only) */}
              <div className="border-b border-hana-border bg-elevated/70 px-3 py-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-text-muted">Rencana #{i + 1}</p>
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
              <div className="grid gap-2.5 p-3">
                {field.resultSchema.map((sub) => (
                  <div key={sub.key} className="space-y-1">
                    <label className="block text-[10px] font-semibold text-text-muted">{sub.label}</label>
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
