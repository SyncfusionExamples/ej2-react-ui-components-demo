import { lazy, Suspense } from 'react';
import PageHeader from '../components/PageHeader';
import { MODULES } from '../components/modules';
import { PageLoader } from '../layout/AppLayout';

const MapsSample = lazy(() => import('../samples/MapsSample'));
const MODULE = MODULES.find((m) => m.key === 'maps')!;

export default function MapsPage() {
  return (
    <div className="page">
      <PageHeader module={MODULE} />
      <div className="viz">
        <Suspense fallback={<PageLoader label="Loading maps…" />}>
          <MapsSample />
        </Suspense>
      </div>
    </div>
  );
}
