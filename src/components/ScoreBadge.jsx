import { levelInfo, clsx } from '../lib/utils';

// Badge level skor 1-4. Terima prop `score` (number) atau `level` (string).
export default function ScoreBadge({ score, level, size = 'sm', showScore = false, className = '' }) {
  const info = levelInfo(level ?? score);
  if (!info) {
    return (
      <span className={clsx('px-3 py-1 rounded-full text-[11px] font-semibold bg-text-muted/15 text-text-secondary whitespace-nowrap', className)}>
        BELUM DINILAI
      </span>
    );
  }
  const sizeCls = size === 'lg' ? 'px-4 py-1.5 text-xs' : 'px-3 py-1 text-[11px]';
  return (
    <span
      className={clsx('inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide whitespace-nowrap', sizeCls, className)}
      style={{ backgroundColor: `${info.color}26`, color: info.color }}
    >
      {showScore && typeof score === 'number' && <span className="font-display font-bold">{score}</span>}
      {info.label}
    </span>
  );
}
