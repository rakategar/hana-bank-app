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
      onClick={() => onClick(user)}
      className="card w-full text-left hover:border-hana-teal-500 hover:shadow-elevated transition-all group focus:outline-none focus:shadow-focus"
    >
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            'h-12 w-12 rounded-full grid place-items-center font-display font-bold shrink-0',
            AVATAR_BG[user.role] || 'bg-elevated text-ink'
          )}
        >
          {initials(user.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-ink truncate group-hover:text-hana-teal-700">{user.name}</p>
          <p className="text-xs text-text-muted truncate">{user.branch}</p>
        </div>
      </div>
      <div className="mt-3">
        <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border', ROLE_STYLES[user.role])}>
          {user.role}
        </span>
      </div>
    </button>
  );
}
