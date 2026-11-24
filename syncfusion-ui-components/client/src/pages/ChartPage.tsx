import PageHeader from '../components/PageHeader';
import { MODULES } from '../components/modules';
import { useMemo, useState } from 'react';
import {
  ChartComponent, SeriesCollectionDirective, SeriesDirective, AxesDirective, AxisDirective,
  Inject, ColumnSeries, LineSeries, SplineSeries, Category, DateTime, Legend, Tooltip,
  Crosshair, Zoom, ScrollBar, StripLine, DataLabel,
} from '@syncfusion/ej2-react-charts';
import { demand, inventorySeries } from '../data/scm';
import { Card, Expectation, RenderMetric, THEME, fmt, useRenderTimer } from '../components/viz';

const SIZES = [10_000, 100_000, 250_000, 500_000];

function ChartSample() {
  return (
    <>
      <Expectation>
        Standard business charts for SCM dashboards and agent results, <em>plus</em> measured performance on
        realistic, large time-series (point 4 in Marvin's summary: "Performance not established").
      </Expectation>
      <DemandChart />
      <LargeDataChart />
    </>
  );
}

/** Demand vs. forecast with OTIF % on a secondary axis and a 95 % target line. */
function DemandChart() {
  return (
    <Card title="Demand vs. forecast and OTIF" subtitle="Column + line + spline on a secondary axis, shared tooltip, crosshair and a target strip line.">
      <ChartComponent
        id="demand-chart"
        theme={THEME}
        height="380px"
        primaryXAxis={{ valueType: 'Category', majorGridLines: { width: 0 } }}
        primaryYAxis={{ title: 'Units (thousands)', minimum: 0, maximum: 1300, interval: 200, lineStyle: { width: 0 } }}
        tooltip={{ enable: true, shared: true }}
        crosshair={{ enable: true, lineType: 'Vertical' }}
        legendSettings={{ visible: true, position: 'Top' }}
        chartArea={{ border: { width: 0 } }}
      >
        <Inject services={[ColumnSeries, LineSeries, SplineSeries, Category, Legend, Tooltip, Crosshair, StripLine, DataLabel]} />
        <AxesDirective>
          <AxisDirective
            name="otif" opposedPosition title="OTIF %" minimum={80} maximum={100} interval={5}
            majorGridLines={{ width: 0 }} labelFormat="{value}%"
            stripLines={[{ start: 95, size: 0.15, sizeType: 'Pixel', color: '#dc2626', dashArray: '6,4', text: 'OTIF target 95%', horizontalAlignment: 'Start', verticalAlignment: 'End', textStyle: { color: '#dc2626', size: '12px' } }]}
          />
        </AxesDirective>
        <SeriesCollectionDirective>
          <SeriesDirective dataSource={demand} xName="month" yName="actual" name="Actual demand" type="Column" fill="#6366f1" columnWidth={0.6} cornerRadius={{ topLeft: 4, topRight: 4 }} />
          <SeriesDirective dataSource={demand} xName="month" yName="forecast" name="Forecast" type="Line" fill="#0ea5e9" width={2} dashArray="5,3" marker={{ visible: true, width: 6, height: 6 }} />
          <SeriesDirective dataSource={demand} xName="month" yName="otif" name="OTIF %" type="Spline" yAxisName="otif" fill="#16a34a" width={2.5} marker={{ visible: true, width: 7, height: 7, dataLabel: { visible: false } }} />
        </SeriesCollectionDirective>
      </ChartComponent>
    </Card>
  );
}

/** Large inventory-position series with zoom / pan / scrollbar and a render-time readout. */
function LargeDataChart() {
  const [points, setPoints] = useState(100_000);
  const [canvas, setCanvas] = useState(true);
  const data = useMemo(() => inventorySeries(points), [points]);
  const timer = useRenderTimer();

  return (
    <Card
      title="Inventory position – large dataset"
      subtitle={`15-minute inventory snapshots (${fmt(points)} points). Drag to zoom, mouse-wheel to zoom, Ctrl/Shift+drag or toolbar to pan.`}
      right={
        <>
          <label>Points
            <select value={points} onChange={(e) => setPoints(Number(e.target.value))}>
              {SIZES.map((s) => <option key={s} value={s}>{fmt(s)}</option>)}
            </select>
          </label>
          <label><input type="checkbox" checked={canvas} onChange={(e) => setCanvas(e.target.checked)} /> Canvas rendering</label>
          <RenderMetric ms={timer.ms} />
        </>
      }
    >
      <ChartComponent
        key={`${points}-${canvas}`}
        id="inventory-chart"
        theme={THEME}
        height="380px"
        enableCanvas={canvas}
        primaryXAxis={{ valueType: 'DateTime', labelFormat: 'MMM yy', majorGridLines: { width: 0 }, edgeLabelPlacement: 'Shift' }}
        primaryYAxis={{
          title: 'On-hand units', lineStyle: { width: 0 }, labelFormat: 'n0',
          stripLines: [{ start: 0, end: 1200, color: '#fee2e2', opacity: 0.6, text: 'Below reorder point', textStyle: { color: '#b91c1c', size: '11px' }, horizontalAlignment: 'Start', verticalAlignment: 'End' }],
        }}
        zoomSettings={{ enableSelectionZooming: true, enableMouseWheelZooming: true, enablePan: true, enableScrollbar: true, mode: 'X', toolbarItems: ['Zoom', 'ZoomIn', 'ZoomOut', 'Pan', 'Reset'] }}
        crosshair={{ enable: true, lineType: 'Vertical' }}
        tooltip={{ enable: true, format: '${point.x}<br/><b>${point.y}</b> units', header: '' }}
        chartArea={{ border: { width: 0 } }}
        load={timer.onLoad}
        loaded={timer.onLoaded}
      >
        <Inject services={[LineSeries, DateTime, Zoom, ScrollBar, Crosshair, Tooltip, StripLine]} />
        <SeriesCollectionDirective>
          <SeriesDirective dataSource={data} xName="x" yName="y" type="Line" fill="#4f46e5" width={1} animation={{ enable: false }} />
        </SeriesCollectionDirective>
      </ChartComponent>
    </Card>
  );
}

const MODULE = MODULES.find((m) => m.key === 'chart')!;

export default function ChartPage() {
  return (
    <div className="page">
      <PageHeader module={MODULE} />
      <div className="viz">
        <ChartSample />
      </div>
    </div>
  );
}
