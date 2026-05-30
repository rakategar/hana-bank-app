import { initials, clsx } from '../lib/utils';

const ROLE_STYLES = {
  RH: 'bg-hana-teal-700/30 text-hana-teal-100 border-hana-teal-700',
  BM: 'bg-hana-pink-500/20 text-hana-pink-500 border-hana-pink-500/40',
  FWSS: 'bg-hana-teal-500/20 text-hana-teal-500 border-hana-teal-500/40',
  FA: 'bg-elevated text-text-secondary border-hana-border',
};

const AVATAR_BG = {
  RH: 'bg-hana-teal-700',
  BM: 'bg-hana-pink-500',
  FWSS: 'bg-hana-teal-500',
  FA: 'bg-elevated',
};

export default function UserCard({ user, onClick }) {
  return (
    <button
      onClick={() => onClick(user)}
      className="card text-left hover:border-hana-teal-500 hover:bg-elevated transition-colors group focus:outline-none focus:ring-2 focus:ring-hana-teal-500"
    >
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            'h-12 w-12 rounded-full grid place-items-center font-display font-bold text-white shrink-0',
            AVATAR_BG[user.role] || 'bg-elevated'
          )}
        >
          {initials(user.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-white truncate group-hover:text-hana-teal-500">{user.name}</p>
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
