import { lazy, Suspense } from 'react';
import PageHeader from '../components/PageHeader';
import { MODULES } from '../components/modules';
import { PageLoader } from '../layout/AppLayout';

const TreeMapSample = lazy(() => import('../samples/TreeMapSample'));
const MODULE = MODULES.find((m) => m.key === 'treemap')!;

export default function TreeMapPage() {
  return (
    <div className="page">
      <PageHeader module={MODULE} />
      <div className="viz">
        <Suspense fallback={<PageLoader label="Loading tree map…" />}>
          <TreeMapSample />
        </Suspense>
      </div>
    </div>
  );
}
