// Synthetic supply-chain (SCM) data shared by every sample.
// All numbers are generated deterministically so the demo looks the same on every run.
// Replace these generators with your real SCM records (API / DataManager) when integrating.

/** Small seeded PRNG (mulberry32) so the sample data is stable between reloads. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Network: suppliers -> plants -> distribution centres -> sales channels
// ---------------------------------------------------------------------------
export type Tier = 'Supplier' | 'Plant' | 'DC' | 'Channel';

export interface Site {
  id: string;
  name: string;
  tier: Tier;
  latitude: number;
  longitude: number;
  country: string;
}

export const sites: Site[] = [
  { id: 'S-SZX', name: 'Shenzhen Electronics', tier: 'Supplier', latitude: 22.54, longitude: 114.06, country: 'China' },
  { id: 'S-SGN', name: 'Ho Chi Minh Plastics', tier: 'Supplier', latitude: 10.82, longitude: 106.63, country: 'Vietnam' },
  { id: 'S-MAA', name: 'Chennai Castings', tier: 'Supplier', latitude: 13.08, longitude: 80.27, country: 'India' },
  { id: 'S-MTY', name: 'Monterrey Steel', tier: 'Supplier', latitude: 25.69, longitude: -100.32, country: 'Mexico' },
  { id: 'S-STR', name: 'Stuttgart Drives', tier: 'Supplier', latitude: 48.78, longitude: 9.18, country: 'Germany' },

  { id: 'P-AUS', name: 'Austin Plant', tier: 'Plant', latitude: 30.27, longitude: -97.74, country: 'United States of America' },
  { id: 'P-GDL', name: 'Guadalajara Plant', tier: 'Plant', latitude: 20.67, longitude: -103.35, country: 'Mexico' },
  { id: 'P-POZ', name: 'Poznan Plant', tier: 'Plant', latitude: 52.41, longitude: 16.93, country: 'Poland' },
  { id: 'P-PEN', name: 'Penang Plant', tier: 'Plant', latitude: 5.41, longitude: 100.33, country: 'Malaysia' },

  { id: 'D-MEM', name: 'Memphis DC', tier: 'DC', latitude: 35.15, longitude: -90.05, country: 'United States of America' },
  { id: 'D-LAX', name: 'Los Angeles DC', tier: 'DC', latitude: 34.05, longitude: -118.24, country: 'United States of America' },
  { id: 'D-RTM', name: 'Rotterdam DC', tier: 'DC', latitude: 51.92, longitude: 4.48, country: 'Netherlands' },
  { id: 'D-DXB', name: 'Dubai DC', tier: 'DC', latitude: 25.2, longitude: 55.27, country: 'United Arab Emirates' },
  { id: 'D-SIN', name: 'Singapore DC', tier: 'DC', latitude: 1.35, longitude: 103.82, country: 'Singapore' },
];

export const channels = ['Retail', 'E-commerce', 'Distributors'] as const;

export const siteById = Object.fromEntries(sites.map((s) => [s.id, s])) as Record<string, Site>;

/** Supplier -> plant volumes (thousand units / quarter). */
const supplierToPlant: [string, string, number][] = [
  ['S-SZX', 'P-PEN', 420], ['S-SZX', 'P-AUS', 260], ['S-SZX', 'P-GDL', 140],
  ['S-SGN', 'P-PEN', 210], ['S-SGN', 'P-GDL', 90],
  ['S-MAA', 'P-PEN', 120], ['S-MAA', 'P-POZ', 150],
  ['S-MTY', 'P-AUS', 230], ['S-MTY', 'P-GDL', 260],
  ['S-STR', 'P-POZ', 310], ['S-STR', 'P-AUS', 80],
];

/** Share of each plant's output that goes to each DC. */
const plantToDcShare: Record<string, [string, number][]> = {
  'P-AUS': [['D-MEM', 0.55], ['D-LAX', 0.35], ['D-RTM', 0.1]],
  'P-GDL': [['D-LAX', 0.5], ['D-MEM', 0.4], ['D-DXB', 0.1]],
  'P-POZ': [['D-RTM', 0.75], ['D-DXB', 0.25]],
  'P-PEN': [['D-SIN', 0.5], ['D-DXB', 0.2], ['D-LAX', 0.3]],
};

/** Share of each DC's volume per sales channel. */
const dcToChannelShare: Record<string, number[]> = {
  'D-MEM': [0.45, 0.4, 0.15],
  'D-LAX': [0.35, 0.5, 0.15],
  'D-RTM': [0.4, 0.3, 0.3],
  'D-DXB': [0.25, 0.25, 0.5],
  'D-SIN': [0.3, 0.45, 0.25],
};

export interface Flow { sourceId: string; targetId: string; value: number }

function buildFlows(): Flow[] {
  const flows: Flow[] = supplierToPlant.map(([s, t, v]) => ({ sourceId: s, targetId: t, value: v }));
  const plantIn: Record<string, number> = {};
  supplierToPlant.forEach(([, p, v]) => (plantIn[p] = (plantIn[p] ?? 0) + v));
  const dcIn: Record<string, number> = {};
  Object.entries(plantToDcShare).forEach(([p, list]) =>
    list.forEach(([d, share]) => {
      const v = Math.round(plantIn[p] * share);
      flows.push({ sourceId: p, targetId: d, value: v });
      dcIn[d] = (dcIn[d] ?? 0) + v;
    }),
  );
  Object.entries(dcToChannelShare).forEach(([d, shares]) =>
    shares.forEach((share, i) => flows.push({ sourceId: d, targetId: channels[i], value: Math.round(dcIn[d] * share) })),
  );
  return flows;
}

export const flows = buildFlows();

/** Lanes shown on the map = physical flows between sites (channels are not geographic). */
export const lanes = flows.filter((f) => siteById[f.sourceId] && siteById[f.targetId]);

// ---------------------------------------------------------------------------
// Demand, forecast and OTIF (monthly)
// ---------------------------------------------------------------------------
export const months = ['Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26', 'Nov 26'];

export const demand = (() => {
  const r = rng(7);
  return months.map((m, i) => {
    const seasonal = 1 + 0.18 * Math.sin((i / 12) * Math.PI * 2 + 1.2);
    const actual = Math.round(820 * seasonal + r() * 90);
    const forecast = Math.round(actual * (0.9 + r() * 0.2));
    const otif = +(88 + r() * 9 - (Math.abs(actual - forecast) / actual) * 25).toFixed(1);
    return { month: m, actual, forecast, otif };
  });
})();

/** Large time-series used for the performance test (inventory position snapshots). */
export function inventorySeries(points: number) {
  const r = rng(42);
  const start = Date.UTC(2024, 0, 1);
  const step = 15 * 60 * 1000; // 15-minute snapshots
  const data = new Array(points);
  let level = 5000;
  for (let i = 0; i < points; i++) {
    level += (r() - 0.5) * 60 + Math.sin(i / 400) * 8;
    if (level < 1200) level += 2500; // replenishment receipt
    data[i] = { x: new Date(start + i * step), y: Math.round(level) };
  }
  return data;
}

// ---------------------------------------------------------------------------
// TreeMap: inventory value by Region > DC > Category, coloured by days of supply
// ---------------------------------------------------------------------------
const regionOfDc: Record<string, string> = {
  'D-MEM': 'North America', 'D-LAX': 'North America', 'D-RTM': 'Europe', 'D-DXB': 'Middle East', 'D-SIN': 'Asia Pacific',
};
const categories = ['Drives & Motors', 'Electronics', 'Castings', 'Plastics', 'Steel Assemblies', 'Spare Parts'];

export const inventory = (() => {
  const r = rng(99);
  const rows: { region: string; dc: string; category: string; value: number; daysOfSupply: number }[] = [];
  Object.entries(regionOfDc).forEach(([dcId, region]) =>
    categories.forEach((category) => {
      const dos = Math.round(5 + r() * 115);
      rows.push({ region, dc: siteById[dcId].name, category, value: Math.round(200 + r() * 1800) * 1000, daysOfSupply: dos });
    }),
  );
  return rows;
})();

// ---------------------------------------------------------------------------
// HeatMap: on-time delivery % per lane per week
// ---------------------------------------------------------------------------
export function onTimeMatrix(laneCount: number, weekCount: number) {
  const r = rng(2026 + laneCount);
  const laneLabels = Array.from({ length: laneCount }, (_, i) => {
    const l = lanes[i % lanes.length];
    const base = `${siteById[l.sourceId].name.split(' ')[0]} → ${siteById[l.targetId].name.split(' ')[0]}`;
    return i < lanes.length ? base : `${base} #${Math.floor(i / lanes.length) + 1}`;
  });
  const weekLabels = Array.from({ length: weekCount }, (_, i) => `W${i + 1}`);
  // Syncfusion HeatMap expects dataSource[xIndex][yIndex] -> columns are weeks, rows are lanes.
  const laneBias = laneLabels.map(() => r() * 12);
  const data = weekLabels.map((_, w) =>
    laneLabels.map((_, l) => {
      const disruption = (w > 8 && w < 12 && l % 5 === 0) ? 22 : 0; // simulated port congestion
      return Math.max(55, Math.min(100, Math.round(97 - laneBias[l] - r() * 10 - disruption)));
    }),
  );
  return { laneLabels, weekLabels, data };
}
