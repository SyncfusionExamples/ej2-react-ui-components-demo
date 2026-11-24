import { useMemo, useState } from 'react';
import {
  SankeyComponent, SankeyNodesCollectionDirective, SankeyNodeDirective, SankeyLinksCollectionDirective,
  SankeyLinkDirective, Inject, SankeyTooltip, SankeyLegend, type SankeyNodeEventArgs,
} from '@syncfusion/ej2-react-charts';
import { channels, flows, sites, siteById } from '../data/scm';
import { Card, Expectation, RenderMetric, THEME, fmt, tierColor, useRenderTimer } from './common';

type Stage = 'all' | 'upstream' | 'downstream';

export default function SankeySample() {
  const [stage, setStage] = useState<Stage>('all');
  const [nodeId, setNodeId] = useState<string | null>(null);
  const timer = useRenderTimer();

  const links = useMemo(() => flows.filter((f) => {
    const tier = siteById[f.sourceId]?.tier;
    if (stage === 'upstream') return tier === 'Supplier' || tier === 'Plant';
    if (stage === 'downstream') return tier === 'Plant' || tier === 'DC';
    return true;
  }), [stage]);

  const usedIds = new Set(links.flatMap((l) => [l.sourceId, l.targetId]));
  const nodes = [
    ...sites.map((s) => ({ id: s.id, label: s.name, color: tierColor[s.tier] })),
    ...channels.map((c) => ({ id: c, label: c, color: tierColor.Channel })),
  ].filter((n) => usedIds.has(n.id));

  const name = (id: string) => siteById[id]?.name ?? id;
  const inbound = nodeId ? flows.filter((f) => f.targetId === nodeId) : [];
  const outbound = nodeId ? flows.filter((f) => f.sourceId === nodeId) : [];
  const total = (l: typeof flows) => l.reduce((a, f) => a + f.value, 0);

  return (
    <>
      <Expectation>
        <b>Business flows</b> through a multi-tier supply chain – Supplier → Plant → Distribution centre → Sales channel –
        with balanced volumes per stage, hover highlighting and click-through to the node's inbound / outbound mix.
      </Expectation>
      <Card
        title="End-to-end material flow (thousand units / quarter)"
        subtitle="Hover a node or link to highlight its path; click a node for its flow balance."
        right={
          <>
            <label>Stages
              <select value={stage} onChange={(e) => { setStage(e.target.value as Stage); setNodeId(null); }}>
                <option value="all">Supplier → Channel (4 tiers)</option>
                <option value="upstream">Supplier → Plant → DC</option>
                <option value="downstream">Plant → DC → Channel</option>
              </select>
            </label>
            <RenderMetric ms={timer.ms} />
          </>
        }
      >
        <div className="legend-inline" style={{ marginBottom: 6 }}>
          <span style={{ ['--c' as string]: tierColor.Supplier }}>Supplier</span>
          <span style={{ ['--c' as string]: tierColor.Plant }}>Plant</span>
          <span style={{ ['--c' as string]: tierColor.DC }}>Distribution centre</span>
          <span style={{ ['--c' as string]: tierColor.Channel }}>Sales channel</span>
        </div>
        <SankeyComponent
          key={stage}
          id="flow-sankey"
          theme={THEME}
          height="540px"
          margin={{ left: 10, right: 40, top: 10, bottom: 10 }}
          nodeStyle={{ width: 18, padding: 14, opacity: 1 }}
          linkStyle={{ opacity: 0.35, highlightOpacity: 0.8, inactiveOpacity: 0.12, curvature: 0.55, colorType: 'Source' }}
          labelSettings={{ visible: true, fontSize: '12px', fontWeight: '500' }}
          tooltip={{ enable: true, nodeFormat: '$name : $value k units', linkFormat: '$start.name → $target.name : $value k units' }}
          legendSettings={{ visible: false }}
          nodeClick={(args: SankeyNodeEventArgs) => setNodeId(args.node.id)}
          load={timer.onLoad}
          loaded={timer.onLoaded}
        >
          <Inject services={[SankeyTooltip, SankeyLegend]} />
          <SankeyNodesCollectionDirective>
            {nodes.map((n) => (
              <SankeyNodeDirective key={n.id} id={n.id} color={n.color} label={{ text: n.label }} />
            ))}
          </SankeyNodesCollectionDirective>
          <SankeyLinksCollectionDirective>
            {links.map((l) => (
              <SankeyLinkDirective key={`${l.sourceId}-${l.targetId}`} sourceId={l.sourceId} targetId={l.targetId} value={l.value} />
            ))}
          </SankeyLinksCollectionDirective>
        </SankeyComponent>

        {nodeId && (
          <div className="detail">
            <h3>{name(nodeId)}</h3>
            <div className="grid-2">
              <div>
                <b>Inbound · {fmt(total(inbound))}k</b>
                <table><tbody>{inbound.map((f) => <tr key={f.sourceId}><td>{name(f.sourceId)}</td><td>{fmt(f.value)}k</td></tr>)}</tbody></table>
              </div>
              <div>
                <b>Outbound · {fmt(total(outbound))}k</b>
                <table><tbody>{outbound.map((f) => <tr key={f.targetId}><td>{name(f.targetId)}</td><td>{fmt(f.value)}k</td></tr>)}</tbody></table>
              </div>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
