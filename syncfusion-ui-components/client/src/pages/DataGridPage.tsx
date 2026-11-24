import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ColumnDirective, ColumnsDirective, Filter, GridComponent, Inject, Page, Sort, type DataStateChangeEventArgs,
} from '@syncfusion/ej2-react-grids';
import PageHeader from '../components/PageHeader';
import { MODULES } from '../components/modules';
import { getOrders } from '../services/scmService';

const MODULE = MODULES.find((m) => m.key === 'grid')!;
const PAGE_SIZE = 100;
const fmt = new Intl.NumberFormat('en-IN');

interface Metrics { count: number; clientMs: number; serverMs: number; requests: number; action: string }

type FilterChoiceAction = {
  requestType?: string;
  filterModel?: { options?: { column?: { field?: string } } };
};

const STATUS_CLASS: Record<string, string> = {
  Delivered: 'ok', Shipped: 'info', 'In Transit': 'info', Processing: 'neutral', Delayed: 'warn', Cancelled: 'bad',
};

export default function DataGridPage() {
  const gridRef = useRef<GridComponent | null>(null);
  const requestSeq = useRef(0);
  const queryKey = useRef('');
  const [metrics, setMetrics] = useState<Metrics>({ count: 0, clientMs: 0, serverMs: 0, requests: 0, action: 'initial' });
  const [error, setError] = useState('');
  const [gridHeight, setGridHeight] = useState(() => Math.max(300, window.innerHeight - 300));

  useEffect(() => {
    const onResize = () => setGridHeight(Math.max(360, window.innerHeight - 300));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /** Fetches one block from the server and hands it to the grid as { result, count }. */
  const loadData = useCallback(async (state: DataStateChangeEventArgs) => {
    const seq = ++requestSeq.current;
    const key = JSON.stringify([state.where ?? [], state.sorted ?? []]);
    queryKey.current = key;
    const t0 = performance.now();
    try {
      const res = await getOrders(state);
      const grid = gridRef.current;
      // Drop out-of-order responses. A virtual-scroll block may still land late, but only
      // if it belongs to the current sort/filter state.
      const action = (state.action as { requestType?: string } | undefined)?.requestType ?? 'initial';
      const isLatest = seq === requestSeq.current;
      if (!grid || (!isLatest && !(action === 'virtualscroll' && key === queryKey.current))) return;
      grid.dataSource = { result: res.result, count: res.count };
      setError('');
      setMetrics((m) => ({
        count: res.count, clientMs: Math.round(performance.now() - t0), serverMs: res.serverMs,
        requests: m.requests + 1, action,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    }
  }, []);

  // Initial load (custom binding does not raise dataStateChange on first render).
  useEffect(() => {
    loadData({ skip: 0, take: PAGE_SIZE * 2 } as DataStateChangeEventArgs);
  }, [loadData]);

  /** Custom binding: every sort / filter / scroll raises this with the grid's query state. */
  const onDataStateChange = (state: DataStateChangeEventArgs) => {
    const action = state.action as FilterChoiceAction | undefined;
    const type = action?.requestType;
    if (type === 'filterchoicerequest' || type === 'filterSearchBegin' || type === 'stringfilterrequest') {
      // The grid re-applies the other columns' filters to the returned list, so send them
      // to the server too: the checkbox list then shows only values that still exist.
      const infinite = !!(gridRef.current?.filterSettings as { enableInfiniteScrolling?: boolean } | undefined)?.enableInfiniteScrolling;
      getOrders(state)
        .then((res) => {
          if (infinite) {
            state.dataSource?.({ result: res.result, count: res.count });
          } else {
            state.dataSource?.(res.result);
          }
        })
        .catch(() => state.dataSource?.(infinite ? { result: [], count: 0 } : []));
      return;
    }
    loadData(state);
  };

  const statusTemplate = (props: { Status: string }) => (
    <span className={`badge ${STATUS_CLASS[props.Status] ?? 'neutral'}`}>{props.Status}</span>
  );

  const clearAll = () => {
    const g = gridRef.current;
    if (!g) return;
    g.clearFiltering();
    g.clearSorting();
  };

  return (
    <div className="page grid-page">
      <PageHeader
        module={MODULE}
        actions={<button className="btn-secondary" onClick={clearAll} id="clear-btn">Clear sort &amp; filters</button>}
      />

      <div className="stats-bar" data-testid="grid-stats">
        <span><b>{fmt.format(metrics.count)}</b> records</span>
        <span>Last request: <b>{metrics.action}</b></span>
        <span>Round trip <b>{metrics.clientMs} ms</b></span>
        <span>Server query <b>{metrics.serverMs} ms</b></span>
        <span>Requests <b>{metrics.requests}</b></span>
        {error && <span className="form-error inline">{error}</span>}
      </div>

      <div className="card grid-card">
        <GridComponent
          ref={gridRef}
          height={gridHeight}
          rowHeight={36}
          allowPaging={true}
          pageSettings={{ pageSize: 200 }}
          allowSorting ={true}
          allowMultiSorting ={true}
          allowFiltering ={true}
          filterSettings={{ type: 'CheckBox',enableInfiniteScrolling: true }}
          dataStateChange={onDataStateChange}
        >
          <ColumnsDirective>
            <ColumnDirective field="OrderID" headerText="Order ID" isPrimaryKey width={110} textAlign="Right" type="number" />
            <ColumnDirective field="OrderDate" headerText="Order Date" width={130} type="date" format="dd-MMM-yyyy" filter={{type:'Menu'}} />
            <ColumnDirective field="Supplier" headerText="Supplier" width={170} />
            <ColumnDirective field="Category" headerText="Category" width={150} />
            <ColumnDirective field="Product" headerText="Product" width={150} />
            <ColumnDirective field="Region" headerText="Region" width={140} />
            <ColumnDirective field="Warehouse" headerText="Warehouse" width={150} />
            <ColumnDirective field="Quantity" headerText="Qty" width={100} textAlign="Right" type="number" format="N0" />
            <ColumnDirective field="UnitPrice" headerText="Unit Price" width={120} textAlign="Right" type="number" format="C2" filter={{type:'Menu'}} />
            <ColumnDirective field="Amount" headerText="Amount" width={140} textAlign="Right" type="number" format="C2" filter={{type:'Menu'}} />
            <ColumnDirective field="Status" headerText="Status" width={130} template={statusTemplate} />
            <ColumnDirective field="ShipMode" headerText="Ship Mode" width={120} />
            <ColumnDirective field="Priority" headerText="Priority" width={110} />
            <ColumnDirective field="DeliveryDate" headerText="Delivery Date" width={140} type="date" format="dd-MMM-yyyy" filter={{type:'Menu'}} />
          </ColumnsDirective>
          <Inject services={[ Sort, Filter, Page]} />
        </GridComponent>
      </div>
    </div>
  );
}
