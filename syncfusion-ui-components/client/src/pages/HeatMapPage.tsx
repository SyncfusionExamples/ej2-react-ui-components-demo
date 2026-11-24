import { lazy, Suspense } from 'react';
import PageHeader from '../components/PageHeader';
import { MODULES } from '../components/modules';
import { PageLoader } from '../layout/AppLayout';

const HeatMapSample = lazy(() => import('../samples/HeatMapSample'));
const MODULE = MODULES.find((m) => m.key === 'heatmap')!;

export default function HeatMapPage() {
  return (
    <div className="page">
      <PageHeader module={MODULE} />
      <div className="viz">
        <Suspense fallback={<PageLoader label="Loading heat map…" />}>
          <HeatMapSample />
        </Suspense>
      </div>
    </div>
  );
}
