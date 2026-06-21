const DIMENSION_TABS = [
  { key: 'house_type', label: '户型' },
  { key: 'area', label: '部位' },
  { key: 'style', label: '风格' },
];

export default function CategoryTabs({ activeKey, onChange }) {
  return (
    <div className="flex bg-white sticky top-0 z-10 border-b border-gray-100">
      {DIMENSION_TABS.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              active ? 'text-slate-900' : 'text-gray-400'
            }`}
          >
            {tab.label}
            {active && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-slate-900 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export { DIMENSION_TABS };
