import { lazy, Suspense } from 'react';
import PageHeader from '../components/PageHeader';
import { MODULES } from '../components/modules';
import { PageLoader } from '../layout/AppLayout';

const SankeySample = lazy(() => import('../samples/SankeySample'));
const MODULE = MODULES.find((m) => m.key === 'sankey')!;

export default function SankeyPage() {
  return (
    <div className="page">
      <PageHeader module={MODULE} />
      <div className="viz">
        <Suspense fallback={<PageLoader label="Loading sankey…" />}>
          <SankeySample />
        </Suspense>
      </div>
    </div>
  );
}
