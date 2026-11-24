import { useMemo, useState } from 'react';
import {
  MapsComponent, LayersDirective, LayerDirective, MarkersDirective, MarkerDirective,
  NavigationLinesDirective, NavigationLineDirective, Inject, Marker, NavigationLine, Zoom, MapsTooltip,
  type IMarkerClickEventArgs,
} from '@syncfusion/ej2-react-maps';
import worldMap from '../data/world-map.json';
import { lanes, sites, siteById, type Site, type Tier } from '../data/scm';
import { Card, Expectation, RenderMetric, THEME, fmt, tierColor, useRenderTimer } from './common';

type LaneFilter = 'all' | 'inbound' | 'outbound';
const DISRUPTED_SITE = 'D-RTM';

const markerShape: Record<Exclude<Tier, 'Channel'>, 'Diamond' | 'Rectangle' | 'Circle'> = {
  Supplier: 'Diamond',
  Plant: 'Rectangle',
  DC: 'Circle',
};

export default function MapsSample() {
  const [animate, setAnimate] = useState(true);
  const [disruption, setDisruption] = useState(false);
  const [filter, setFilter] = useState<LaneFilter>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const timer = useRenderTimer();

  const maxVolume = Math.max(...lanes.map((l) => l.value));

  const visibleLanes = useMemo(
    () =>
      lanes.filter((l) => {
        const tier = siteById[l.sourceId].tier;
        if (filter === 'inbound' && tier !== 'Supplier') return false; // supplier -> plant
        if (filter === 'outbound' && tier !== 'Plant') return false; // plant -> DC
        return true;
      }),
    [filter],
  );

  const laneStyle = (sourceId: string, targetId: string) => {
    const isSelected = !selected || sourceId === selected || targetId === selected;
    const disrupted = disruption && (sourceId === DISRUPTED_SITE || targetId === DISRUPTED_SITE);
    const color = disrupted ? '#dc2626' : tierColor[siteById[sourceId].tier];
    return { color: isSelected ? color : '#cbd5e1', dimmed: !isSelected, disrupted };
  };

  const selectedSite = selected ? siteById[selected] : null;
  const inbound = selected ? lanes.filter((l) => l.targetId === selected) : [];
  const outbound = selected ? lanes.filter((l) => l.sourceId === selected) : [];

  return (
    <>
      <Expectation>
        <b>Animated geographic views</b> of the supply network: animated freight lanes (direction of flow, thickness = volume),
        tier-specific site markers, a simulated disruption with a pulsing alert, click-to-focus on a site, zoom &amp; pan.
        Base map here is offline GeoJSON; the same layer can use OpenStreetMap / Azure / custom tile URLs (incl. Mapbox raster tiles).
      </Expectation>
      <Card
        title="Global supply network – flows by lane"
        subtitle="Click a site marker to focus on its lanes. Lane width is proportional to quarterly volume."
        right={
          <>
            <label>Lanes
              <select value={filter} onChange={(e) => setFilter(e.target.value as LaneFilter)}>
                <option value="all">All lanes</option>
                <option value="inbound">Supplier → Plant</option>
                <option value="outbound">Plant → DC</option>
              </select>
            </label>
            <label><input type="checkbox" checked={animate} onChange={(e) => setAnimate(e.target.checked)} /> Animate flows</label>
            <label><input type="checkbox" checked={disruption} onChange={(e) => setDisruption(e.target.checked)} /> Simulate Rotterdam port congestion</label>
            {selected && <button className="btn" onClick={() => setSelected(null)}>Clear focus</button>}
            <RenderMetric ms={timer.ms} />
          </>
        }
      >
        <div className="legend-inline" style={{ marginBottom: 6 }}>
          <span style={{ ['--c' as string]: tierColor.Supplier }}>Supplier (◆)</span>
          <span style={{ ['--c' as string]: tierColor.Plant }}>Plant (■)</span>
          <span style={{ ['--c' as string]: tierColor.DC }}>Distribution centre (●)</span>
          {disruption && <span style={{ ['--c' as string]: '#dc2626' }}>Disrupted lanes</span>}
        </div>
        <div className={animate ? 'flow-animated' : undefined}>
          <MapsComponent
            key={`${filter}-${disruption}-${selected}`}
            id="scm-map"
            theme={THEME}
            height="620px"
            zoomSettings={{ enable: true, mouseWheelZoom: true, enablePanning: true, doubleClickZoom: true, toolbarSettings: { buttonSettings: { toolbarItems: ['ZoomIn', 'ZoomOut', 'Reset'] } } }}
            markerClick={(args: IMarkerClickEventArgs) => {
              const data = args.data as Site | undefined;
              if (data?.id) setSelected(data.id);
            }}
            load={timer.onLoad}
            loaded={timer.onLoaded}
          >
            <Inject services={[Marker, NavigationLine, Zoom, MapsTooltip]} />
            <LayersDirective>
              <LayerDirective
                shapeData={worldMap}
                shapeSettings={{ fill: '#e5e7eb', border: { color: '#ffffff', width: 0.5 } }}
              >
                <NavigationLinesDirective>
                  {visibleLanes.flatMap((l) => {
                    const style = laneStyle(l.sourceId, l.targetId);
                    const width = style.dimmed ? 1 : 1 + (l.value / maxVolume) * 5;
                    return laneSegments(siteById[l.sourceId], siteById[l.targetId]).map((seg, j, all) => (
                      <NavigationLineDirective
                        key={`${l.sourceId}-${l.targetId}-${j}`}
                        visible
                        latitude={seg.latitude}
                        longitude={seg.longitude}
                        angle={all.length > 1 ? 0 : 0.12}
                        width={width}
                        color={style.color}
                        dashArray={style.disrupted ? '3,3' : ''}
                        // SVG arrow markers scale with stroke width, so keep the arrow head ~8px regardless of lane thickness.
                        arrowSettings={{ showArrow: !style.dimmed && j === all.length - 1, position: 'End', size: Math.max(1.2, 8 / width), color: style.color }}
                      />
                    ));
                  })}
                </NavigationLinesDirective>
                <MarkersDirective>
                  {(['Supplier', 'Plant', 'DC'] as const).map((tier) => (
                    <MarkerDirective
                      key={tier}
                      visible
                      dataSource={sites.filter((s) => s.tier === tier)}
                      shape={markerShape[tier]}
                      fill={tierColor[tier]}
                      width={tier === 'DC' ? 13 : 12}
                      height={tier === 'DC' ? 13 : 12}
                      border={{ color: '#ffffff', width: 1.5 }}
                      animationDuration={600}
                      tooltipSettings={{ visible: true, valuePath: 'name', format: '<b>${name}</b><br/>${tier} · ${country}' }}
                    />
                  ))}
                  <MarkerDirective
                    visible={disruption}
                    dataSource={[siteById[DISRUPTED_SITE]]}
                    template={'<div class="pulse"></div>'}
                    animationDuration={0}
                  />
                </MarkersDirective>
              </LayerDirective>
            </LayersDirective>
          </MapsComponent>
        </div>

        {selectedSite && (
          <div className="detail">
            <h3>{selectedSite.name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {selectedSite.tier} · {selectedSite.country}</span></h3>
            <div className="grid-2">
              <LaneTable title="Inbound" rows={inbound.map((l) => [siteById[l.sourceId]?.name ?? l.sourceId, l.value])} />
              <LaneTable title="Outbound" rows={outbound.map((l) => [siteById[l.targetId]?.name ?? l.targetId, l.value])} />
            </div>
          </div>
        )}
        {disruption && (
          <div className="detail" style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
            <b style={{ color: '#b91c1c' }}>Disruption scenario:</b> Rotterdam DC inbound delayed ~9 days.{' '}
            {fmt(lanes.filter((l) => l.targetId === DISRUPTED_SITE).reduce((a, l) => a + l.value, 0))}k units/quarter on{' '}
            {lanes.filter((l) => l.targetId === DISRUPTED_SITE).length} inbound lanes affected – candidates for re-routing via Dubai DC.
          </div>
        )}
      </Card>
    </>
  );
}

/**
 * Trans-Pacific lanes (e.g. Penang -> Los Angeles) would otherwise be drawn the long way round, across Africa.
 * Split them into two segments that meet at the date line so they follow the real ocean route.
 */
function laneSegments(s: Site, t: Site): { latitude: number[]; longitude: number[] }[] {
  const dLon = t.longitude - s.longitude;
  if (Math.abs(dLon) <= 180) return [{ latitude: [s.latitude, t.latitude], longitude: [s.longitude, t.longitude] }];
  const edge = s.longitude > 0 ? 180 : -180;
  const span = 360 - Math.abs(dLon);
  const latAtEdge = s.latitude + (t.latitude - s.latitude) * ((180 - Math.abs(s.longitude)) / span);
  return [
    { latitude: [s.latitude, latAtEdge], longitude: [s.longitude, edge] },
    { latitude: [latAtEdge, t.latitude], longitude: [-edge, t.longitude] },
  ];
}

function LaneTable({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div>
      <b>{title}</b>
      {rows.length === 0 ? <p style={{ margin: 0, color: 'var(--muted)' }}>No lanes in this direction on the map</p> : (
        <table><tbody>{rows.map(([n, v]) => <tr key={n}><td>{n}</td><td>{fmt(v)}k units</td></tr>)}</tbody></table>
      )}
    </div>
  );
}
