import { useState } from 'react';
import { endpoints, categories, type Endpoint } from '../endpoints';

interface EndpointSidebarProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

const methodStyles: Record<Endpoint['method'], string> = {
  GET: 'bg-emerald-500/20 text-emerald-400',
  POST: 'bg-sky-500/20 text-sky-400',
  DELETE: 'bg-red-500/20 text-red-400',
};

export default function EndpointSidebar({ selectedId, onSelect }: EndpointSidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCategory = (category: string) => {
    setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const groupedEndpoints = categories.reduce<Record<string, Endpoint[]>>((acc, cat) => {
    acc[cat] = endpoints.filter((e) => e.category === cat);
    return acc;
  }, {});

  return (
    <aside className="w-72 shrink-0 h-full overflow-y-auto bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <span className="text-amber-400 text-xl" aria-hidden="true">
            &#9889;
          </span>
          API Explorer
        </h1>
      </div>

      {/* Endpoint list */}
      <nav className="flex-1 overflow-y-auto py-3">
        {categories.map((category) => {
          const isCollapsed = collapsed[category] ?? false;
          const items = groupedEndpoints[category];

          if (!items || items.length === 0) return null;

          return (
            <div key={category} className="mb-1">
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-400 transition-colors duration-150 cursor-pointer"
              >
                <span>{category}</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isCollapsed ? '-rotate-90' : 'rotate-0'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Endpoint items */}
              {!isCollapsed && (
                <ul className="mt-0.5">
                  {items.map((endpoint) => {
                    const isActive = endpoint.id === selectedId;

                    return (
                      <li key={endpoint.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(endpoint.id)}
                          className={`w-full flex items-center gap-2.5 px-5 py-2 text-sm transition-all duration-150 cursor-pointer border-l-2 ${
                            isActive
                              ? 'bg-slate-700/50 border-l-[#38bdf8] text-slate-100'
                              : 'border-l-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                          }`}
                        >
                          <span
                            className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold leading-none tracking-wide shrink-0 min-w-[3rem] ${methodStyles[endpoint.method]}`}
                          >
                            {endpoint.method}
                          </span>
                          <span className="truncate">{endpoint.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
