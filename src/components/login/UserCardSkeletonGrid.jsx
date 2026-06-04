export default function UserCardSkeletonGrid({ count = 8 }) {
  return (
    <div className="grid min-h-[292px] grid-cols-1 content-start gap-3 pr-1 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-white/70 bg-white/70 p-3 shadow-card backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="skeleton h-10 w-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-4 w-32 max-w-full" />
              <div className="skeleton h-3 w-24 max-w-full" />
            </div>
            <div className="skeleton h-5 w-10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
