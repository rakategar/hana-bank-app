import { initials, clsx } from '../lib/utils';

const ROLE_STYLES = {
  RH: 'bg-hana-teal-700/15 text-hana-teal-700 border-hana-teal-700/30',
  BM: 'bg-hana-pink-50 text-hana-pink-600 border-hana-pink-500/30',
  FWSS: 'bg-hana-teal-50 text-hana-teal-700 border-hana-teal-500/30',
  FA: 'bg-elevated text-text-secondary border-hana-border',
};

const AVATAR_BG = {
  RH: 'bg-hana-teal-700 text-white',
  BM: 'bg-hana-pink-500 text-white',
  FWSS: 'bg-hana-teal-500 text-white',
  FA: 'bg-hana-teal-50 text-hana-teal-700',
};

export default function UserCard({ user, onClick }) {
  return (
    <button
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onClick(user)}
      className="group appearance-none rounded-xl border border-white/70 bg-white/70 p-3 text-left shadow-card outline-none ring-0 backdrop-blur transition-all hover:border-hana-teal-300 hover:bg-white/90 hover:shadow-raised focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0"
    >
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            'grid h-10 w-10 shrink-0 place-items-center rounded-lg font-display text-sm font-bold',
            AVATAR_BG[user.role] || 'bg-elevated text-ink'
          )}
        >
          {initials(user.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink group-hover:text-hana-teal-700">{user.name}</p>
          <p className="truncate text-xs text-text-muted">{user.branch}</p>
        </div>
        <span className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold', ROLE_STYLES[user.role])}>
          {user.role}
        </span>
      </div>
    </button>
  );
}
