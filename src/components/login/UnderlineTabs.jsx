export default function UnderlineTabs({ tabs, activeValue, onChange }) {
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.value === activeValue));
  const columnWidth = `${100 / tabs.length}%`;

  return (
    <div
      className="relative mb-5 grid border-b border-hana-border"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      <span
        className="absolute bottom-[-1px] left-0 h-0.5 rounded-full bg-hana-teal-600 transition-transform duration-300 ease-out"
        style={{
          width: columnWidth,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />

      {tabs.map(({ value, label, icon: Icon }) => {
        const isActive = value === activeValue;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`relative z-10 inline-flex items-center justify-center gap-2 px-3 pb-3 pt-1 text-sm font-bold transition-colors duration-300 focus:outline-none focus-visible:shadow-focus ${
              isActive ? 'text-hana-teal-700' : 'text-text-muted hover:text-ink'
            }`}
          >
            {Icon && <Icon size={16} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
