import type { ReactElement } from 'react';

const svg = (children: ReactElement) => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const Icons = {
  grid: svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M3 14h18M9 4v16M15 4v16" /></>),
  pivot: svg(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18" /><path d="M13 13h5M13 17h5M15.5 13v4" /></>),
  chart: svg(<><path d="M4 20V4" /><path d="M4 20h16" /><rect x="7" y="12" width="3" height="5" /><rect x="12" y="8" width="3" height="9" /><rect x="17" y="5" width="3" height="12" /></>),
  maps: svg(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>),
  treemap: svg(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 3v18M12 12h9M7 12v9" /></>),
  heatmap: svg(<><rect x="3" y="3" width="5" height="5" /><rect x="9.5" y="3" width="5" height="5" /><rect x="16" y="3" width="5" height="5" /><rect x="3" y="9.5" width="5" height="5" /><rect x="9.5" y="9.5" width="5" height="5" /><rect x="16" y="9.5" width="5" height="5" /><rect x="3" y="16" width="5" height="5" /><rect x="9.5" y="16" width="5" height="5" /><rect x="16" y="16" width="5" height="5" /></>),
  sankey: svg(<><path d="M3 5h4c6 0 6 10 12 10h2M3 12h4c6 0 6-7 12-7h2M3 19h4c6 0 6-4 12-4" /></>),
  gantt: svg(<><path d="M3 5h18M3 19h18" /><rect x="4" y="8" width="8" height="3" rx="1" /><rect x="9" y="13" width="10" height="3" rx="1" /></>),
  schedule: svg(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M7 14h3M7 17h3M13 14h4" /></>),
  diagram: svg(<><rect x="9" y="3" width="6" height="5" rx="1" /><rect x="3" y="16" width="6" height="5" rx="1" /><rect x="15" y="16" width="6" height="5" rx="1" /><path d="M12 8v4M6 16v-4h12v4" /></>),
  dashboard: svg(<><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></>),
  logout: svg(<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></>),
  menu: svg(<><path d="M4 6h16M4 12h16M4 18h16" /></>),
};

export interface AppModule {
  key: keyof typeof Icons;
  path: string;
  title: string;
  description: string;
  tag: string;
  color: string;
}

export const MODULES: AppModule[] = [
  { key: 'grid', path: '/grid', title: 'Data Grid', tag: '1L records', color: '#2563eb', description: '1,00,000 SCM orders with server-side sorting, filtering and virtual scrolling.' },
  { key: 'pivot', path: '/pivot', title: 'Pivot Table', tag: 'Analytics', color: '#7c3aed', description: 'Multi-dimensional analysis of the same SCM data by region, category and period.' },
  { key: 'chart', path: '/chart', title: 'Chart', tag: 'Trends', color: '#0891b2', description: 'Demand vs. forecast and large time-series performance on synthetic SCM data.' },
  { key: 'maps', path: '/maps', title: 'Maps', tag: 'Geo', color: '#0d9488', description: 'Animated freight lanes, tier markers and disruption alerts on a world map.' },
  { key: 'treemap', path: '/treemap', title: 'Tree Map', tag: 'Hierarchy', color: '#d97706', description: 'Inventory exposure by region, DC and category with days-of-supply risk bands.' },
  { key: 'heatmap', path: '/heatmap', title: 'Heat Map', tag: 'Service level', color: '#dc2626', description: 'On-time delivery % by lane and week across the transport network.' },
  { key: 'sankey', path: '/sankey', title: 'Sankey', tag: 'Flow', color: '#2563eb', description: 'Supplier to plant to DC to channel business flows.' },
  { key: 'gantt', path: '/gantt', title: 'Gantt', tag: 'Planning', color: '#ea580c', description: 'Warehouse rollout plan with task dependencies and progress.' },
  { key: 'schedule', path: '/schedule', title: 'Schedule', tag: 'Calendar', color: '#16a34a', description: 'Inbound and outbound shipment calendar for the distribution centres.' },
  { key: 'diagram', path: '/diagram', title: 'Diagram', tag: 'Flow', color: '#db2777', description: 'End-to-end supply chain flow from supplier to customer.' },
];
