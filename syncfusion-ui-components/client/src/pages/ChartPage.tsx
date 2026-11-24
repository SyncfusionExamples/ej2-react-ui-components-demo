import { lazy, Suspense } from 'react';
import PageHeader from '../components/PageHeader';
import { MODULES } from '../components/modules';
import { PageLoader } from '../layout/AppLayout';

const ChartSample = lazy(() => import('../samples/ChartSample'));
const MODULE = MODULES.find((m) => m.key === 'chart')!;

export default function ChartPage() {
  return (
    <div className="page">
      <PageHeader module={MODULE} />
      <div className="viz">
        <Suspense fallback={<PageLoader label="Loading chart…" />}>
          <ChartSample />
        </Suspense>
      </div>
    </div>
  );
}
