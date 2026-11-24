import { useEffect, useMemo, useState } from 'react';
import {
  FieldList, GroupingBar, Inject, Pager, PivotViewComponent, VirtualScroll,
} from '@syncfusion/ej2-react-pivotview';
import type { DataSourceSettingsModel } from '@syncfusion/ej2-pivotview/src/model/datasourcesettings-model';
import PageHeader from '../components/PageHeader';
import { MODULES } from '../components/modules';
import { PageLoader } from '../layout/AppLayout';
import { getPivotData, type PivotRow } from '../services/scmService';

const MODULE = MODULES.find((m) => m.key === 'pivot')!;
const fmt = new Intl.NumberFormat('en-IN');

export default function PivotPage() {
  const [rows, setRows] = useState<PivotRow[] | null>(null);
  const [meta, setMeta] = useState({ sourceCount: 0, ms: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    const t0 = performance.now();
    getPivotData()
      .then((res) => {
        setRows(res.rows);
        setMeta({ sourceCount: res.sourceCount, ms: Math.round(performance.now() - t0) });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load pivot data'));
  }, []);

  const dataSourceSettings = useMemo<DataSourceSettingsModel | null>(() => rows && {
    dataSource: rows as unknown as DataSourceSettingsModel['dataSource'],
    expandAll: true,
    enableSorting: true,
    rows: [{ name: 'Region' }, { name: 'Category' }, { name: 'Product' }],
    columns: [{ name: 'Year' }, { name: 'Quarter' }],
    values: [{ name: 'Amount', caption: 'Order Value' }, { name: 'Quantity', caption: 'Units' }],
    filters: [{ name: 'Status' }],
    formatSettings: [{ name: 'Amount', format: 'C0' }, { name: 'Quantity', format: 'N0' }, { name: 'Orders', format: 'N0' }],
    fieldMapping: [
      { name: 'Orders', caption: 'Order Count' },
      { name: 'Year', type: 'string' as never },
    ],
    showGrandTotals: true,
    showSubTotals: true,
  }, [rows]);

  return (
    <div className="page">
      <PageHeader module={MODULE} />
      <div className="stats-bar">
        <span><b>{fmt.format(meta.sourceCount)}</b> source records</span>
        <span>Aggregated rows <b>{rows ? fmt.format(rows.length) : '—'}</b></span>
        <span>Load time <b>{meta.ms} ms</b></span>
        <span className="muted">Drag fields between the grouping bar and the field list to re-pivot.</span>
        {error && <span className="form-error inline">{error}</span>}
      </div>
      <div className="card pivot-card">
        {!dataSourceSettings ? (
          <PageLoader label="Loading pivot data…" />
        ) : (
          <PivotViewComponent
            id="scm-pivot"
            height={450}
            width="100%"
            dataSourceSettings={dataSourceSettings}
            showFieldList
            showGroupingBar
            enablePaging={true}
            pageSettings={{
              rowPageSize: 10,
              
          }} 
            allowDeferLayoutUpdate
            gridSettings={{ columnWidth: 150 }}
          >
            <Inject services={[FieldList, GroupingBar, VirtualScroll, Pager]} />
          </PivotViewComponent>
        )}
      </div>
    </div>
  );
}
