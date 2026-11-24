import { useMemo, useState } from 'react';
import {
  TreeMapComponent, LevelsDirective, LevelDirective, Inject, TreeMapTooltip, TreeMapLegend, TreeMapHighlight,
} from '@syncfusion/ej2-react-treemap';
import { inventory } from '../data/scm';
import { Card, Expectation, RenderMetric, THEME, fmt, useRenderTimer } from './common';

const BANDS = [
  { from: 0, to: 14, color: '#dc2626', label: 'Stock-out risk (< 15 days)' },
  { from: 15, to: 60, color: '#16a34a', label: 'Healthy (15–60 days)' },
  { from: 61, to: 365, color: '#f59e0b', label: 'Excess (> 60 days)' },
];

type GroupBy = 'region' | 'category';

export default function TreeMapSample() {
  const [groupBy, setGroupBy] = useState<GroupBy>('region');
  const timer = useRenderTimer();

  // TreeMap processes its dataSource in place, so give it its own copy and compute KPIs from the source rows.
  const rows = useMemo(
    () => inventory.map((r) => ({ ...r, valueText: `$${(r.value / 1_000_000).toFixed(2)}M` })),
    [groupBy],
  );
  const total = inventory.reduce((a, r) => a + r.value, 0);
  const atRisk = inventory.filter((r) => r.daysOfSupply < 15);
  const excess = inventory.filter((r) => r.daysOfSupply > 60);
  const sum = (list: typeof inventory) => `$${(list.reduce((a, r) => a + r.value, 0) / 1_000_000).toFixed(1)}M`;

  // Hierarchy can be switched without changing the data: Region > DC > Category, or Category > Region > DC.
  const levels = groupBy === 'region'
    ? [{ path: 'region', fill: '#334155' }, { path: 'dc', fill: '#64748b' }]
    : [{ path: 'category', fill: '#334155' }, { path: 'region', fill: '#64748b' }];
  const leafLabel = groupBy === 'region' ? 'category' : 'dc';

  return (
    <>
      <Expectation>
        Hierarchical inventory exposure for planners and agent findings: drill down Region → DC → Category, sized by
        inventory value and coloured by <b>days of supply</b> so stock-out risk and excess stock stand out immediately.
      </Expectation>
      <Card
        title="Inventory value by network node, coloured by days of supply"
        subtitle={`Total inventory $${(total / 1_000_000).toFixed(1)}M · ${atRisk.length} DC/category groups at stock-out risk (${sum(atRisk)}) · ${excess.length} with excess (${sum(excess)}). Click a header to drill down; use the breadcrumb to go back.`}
        right={
          <>
            <label>Group by
              <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
                <option value="region">Region → DC → Category</option>
                <option value="category">Category → Region → DC</option>
              </select>
            </label>
            <RenderMetric ms={timer.ms} />
          </>
        }
      >
        <TreeMapComponent
          key={groupBy}
          id="inventory-treemap"
          theme={THEME}
          height="520px"
          dataSource={rows}
          weightValuePath="value"
          rangeColorValuePath="daysOfSupply"
          enableDrillDown
          enableBreadcrumb
          breadcrumbConnector=" › "
          format="n0"
          useGroupingSeparator
          tooltipSettings={{ visible: true, format: '<b>${dc}</b> · ${category}<br/>Inventory: ${valueText}<br/>Days of supply: ${daysOfSupply}' }}
          legendSettings={{ visible: true, position: 'Top', shape: 'Rectangle', mode: 'Default' }}
          highlightSettings={{ enable: true, fill: '#c7d2fe', opacity: '0.6' }}
          leafItemSettings={{
            labelPath: leafLabel,
            labelFormat: '${' + leafLabel + '}\n${valueText}',
            labelPosition: 'TopLeft',
            labelStyle: { color: '#ffffff', size: '12px' },
            border: { color: '#ffffff', width: 1 },
            gap: 2,
            colorMapping: BANDS,
          }}
          load={timer.onLoad}
          loaded={timer.onLoaded}
        >
          <Inject services={[TreeMapTooltip, TreeMapLegend, TreeMapHighlight]} />
          <LevelsDirective>
            {levels.map((l) => (
              <LevelDirective
                key={l.path}
                groupPath={l.path}
                fill={l.fill}
                headerHeight={22}
                headerFormat={'${' + l.path + '}'}
                headerStyle={{ color: '#ffffff', size: '13px', fontWeight: '600' }}
                headerAlignment="Near"
                groupGap={3}
                border={{ color: '#ffffff', width: 1 }}
              />
            ))}
          </LevelsDirective>
        </TreeMapComponent>

        <div className="detail">
          <h3>Agent finding (example)</h3>
          Top stock-out risks:{' '}
          {[...atRisk].sort((a, b) => a.daysOfSupply - b.daysOfSupply).slice(0, 4)
            .map((r) => `${r.dc} – ${r.category} (${r.daysOfSupply} d, ${fmt(Math.round(r.value / 1000))}k)`).join('; ') || 'none'}.
        </div>
      </Card>
    </>
  );
}
