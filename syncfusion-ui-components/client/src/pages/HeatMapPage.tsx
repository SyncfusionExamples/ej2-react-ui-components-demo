import PageHeader from '../components/PageHeader';
import { MODULES } from '../components/modules';
import { useMemo, useState } from 'react';
import {
  HeatMapComponent, Inject, Legend, Tooltip, type ICellClickEventArgs, type ITooltipEventArgs,
} from '@syncfusion/ej2-react-heatmap';
import { onTimeMatrix } from '../data/scm';
import { Card, Expectation, RenderMetric, THEME, fmt, useRenderTimer } from '../components/viz';

const SIZES = [
  { label: '22 lanes × 26 weeks', lanes: 22, weeks: 26 },
  { label: '200 lanes × 52 weeks (10.4k cells)', lanes: 200, weeks: 52 },
  { label: '1,000 lanes × 52 weeks (52k cells)', lanes: 1000, weeks: 52 },
];

function HeatMapSample() {
  const [sizeIdx, setSizeIdx] = useState(0);
  const [cell, setCell] = useState<{ lane: string; week: string; value: number } | null>(null);
  const timer = useRenderTimer();
  const size = SIZES[sizeIdx];
  const { laneLabels, weekLabels, data } = useMemo(() => onTimeMatrix(size.lanes, size.weeks), [size]);
  const small = size.lanes <= 30;

  return (
    <>
      <Expectation>
        Spot service-level problems across the transport network at a glance: <b>on-time delivery % per lane per week</b>,
        with a simulated port-congestion window (weeks 10–12). Size selector shows behaviour on larger, realistic matrices.
      </Expectation>
      <Card
        title="On-time delivery % by lane and week"
        subtitle="Red = below 80 %, amber ≈ 80–90 %, green ≥ 95 %. Click a cell to inspect it."
        right={
          <>
            <label>Matrix
              <select value={sizeIdx} onChange={(e) => { setSizeIdx(Number(e.target.value)); setCell(null); }}>
                {SIZES.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
              </select>
            </label>
            <RenderMetric ms={timer.ms} />
          </>
        }
      >
        <HeatMapComponent
          key={sizeIdx}
          id="otd-heatmap"
          theme={THEME}
          height={small ? '560px' : '640px'}
          dataSource={data}
          renderingMode={small ? 'SVG' : 'Canvas'}
          xAxis={{ labels: weekLabels, labelRotation: 0, labelIntersectAction: 'Trim' }}
          yAxis={{ labels: laneLabels, isInversed: true, textStyle: { size: '11px' }, labelIntersectAction: 'Trim', maxLabelLength: 160 }}
          paletteSettings={{
            type: 'Gradient',
            palette: [
              { value: 55, color: '#b91c1c' },
              { value: 80, color: '#f87171' },
              { value: 88, color: '#fcd34d' },
              { value: 95, color: '#86efac' },
              { value: 100, color: '#15803d' },
            ],
          }}
          cellSettings={{ showLabel: small, format: '{value}', border: { width: small ? 1 : 0, color: '#ffffff' }, textStyle: { size: '10px' } }}
          legendSettings={{ visible: true, position: 'Right', labelFormat: '{value}%', height: '300px' }}
          tooltipRender={(args: ITooltipEventArgs) => {
            args.content = [`${args.yLabel} · ${args.xLabel}<br/>On-time: <b>${args.value}%</b>`];
          }}
          cellClick={(args: ICellClickEventArgs) => setCell({ lane: String(args.yLabel), week: String(args.xLabel), value: Number(args.value) })}
          load={timer.onLoad}
          loaded={timer.onLoaded}
        >
          <Inject services={[Legend, Tooltip]} />
        </HeatMapComponent>
        <div className="detail">
          {cell
            ? <><b>{cell.lane}</b>, {cell.week}: {cell.value}% on time {cell.value < 80 ? '– below the 80% escalation threshold; an agent could open an exception here.' : ''}</>
            : <>Rendering {fmt(size.lanes * size.weeks)} cells in {small ? 'SVG' : 'Canvas'} mode. Click any cell for details.</>}
        </div>
      </Card>
    </>
  );
}

const MODULE = MODULES.find((m) => m.key === 'heatmap')!;

export default function HeatMapPage() {
  return (
    <div className="page">
      <PageHeader module={MODULE} />
      <div className="viz">
        <HeatMapSample />
      </div>
    </div>
  );
}
