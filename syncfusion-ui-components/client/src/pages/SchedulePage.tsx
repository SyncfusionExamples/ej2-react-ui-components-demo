import '@syncfusion/ej2-tailwind3-theme/styles/schedule/index-lite.css';
import '@syncfusion/ej2-tailwind3-theme/styles/multi-select/index-lite.css';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  Agenda, DragAndDrop, Inject, Month, ResourceDirective, ResourcesDirective, ScheduleComponent, TimelineMonth,
  TimelineViews, ViewDirective, ViewsDirective,
  type ActionEventArgs, type EventRenderedArgs, type PopupOpenEventArgs, type RenderCellEventArgs,
} from '@syncfusion/ej2-react-schedule';
import { CheckBoxSelection, Inject as DropDownInject, MultiSelectComponent } from '@syncfusion/ej2-react-dropdowns';
import PageHeader from '../components/PageHeader';
import { MODULES } from '../components/modules';
import {
  fromYmd, getScheduleEvents, getScheduleResources, rescheduleOrder, resetSchedule, toPlanEvent, toYmd,
  type EventFilters, type PlanEvent, type RegionResource, type ScheduleOrder, type ScheduleResources, type WarehouseResource,
} from '../services/scheduleService';

const MODULE = MODULES.find((m) => m.key === 'schedule')!;

const STATUS_COLOR: Record<string, string> = {
  Delivered: '#16a34a',
  Shipped: '#2563eb',
  'In Transit': '#0891b2',
  Processing: '#64748b',
  Delayed: '#ea580c',
  Cancelled: '#dc2626',
};

const fmtNum = new Intl.NumberFormat('en-IN');
const fmtMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtDay = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtShort = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
const dayLabel = (ymd: string) => fmtDay.format(fromYmd(ymd));

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const GROUP_BY_WAREHOUSE = { resources: ['Regions', 'Warehouses'] };
const NO_TIME_SCALE = { enable: false };
const SCHEDULE_HEIGHT = Math.max(520, window.innerHeight - 330);

interface Metrics {
  range: string;
  count: number;
  shown: number;
  truncated: boolean;
  scanned: number;
  serverMs: number;
  roundTripMs: number;
  renderMs: number | null;
  requests: number;
  byStatus: Record<string, number>;
}

type Notice = { kind: 'ok' | 'error'; text: string } | null;

// ---------- Templates ----------

function Tooltip(e: PlanEvent) {
  return (
    <div className="plan-tip">
      <b>{e.Subject}</b>
      <div>{e.Warehouse} · {e.Supplier}</div>
      <div>{e.Status} · {e.Priority} priority · {e.ShipMode}</div>
    </div>
  );
}

function QuickInfoContent(e: PlanEvent) {
  if (!e?.Id) return <div />;
  const rows: [string, string][] = [
    ['Delivery', dayLabel(e.Date)],
    ['Ordered', `${dayLabel(e.OrderDate)} · lead ${e.LeadTimeDays} d`],
    ['Warehouse', `${e.Warehouse} (${e.Region})`],
    ['Supplier', e.Supplier],
    ['Product', `${e.Product} · ${e.Category}`],
    ['Quantity', fmtNum.format(e.Quantity)],
    ['Amount', fmtMoney.format(e.Amount)],
    ['Ship mode', e.ShipMode],
    ['Priority', e.Priority],
  ];
  return (
    <div className="qi-body">
      <dl className="qi-grid">
        {rows.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </div>
  );
}

function QuickInfoFooter(e: PlanEvent) {
  if (!e?.Id) return <div />;
  return (
    <div className="qi-footer">
      {e.IsReadonly
        ? `${e.Status} orders are locked and can't be rescheduled.`
        : `Drag to another day, or to another warehouse in ${e.Region}, to reschedule.`}
      {e.Rescheduled && <span className="qi-flag">Rescheduled</span>}
    </div>
  );
}

// ---------- Scheduler (memoised so metric/notice updates don't touch it) ----------

interface PlannerProps {
  schedRef: RefObject<ScheduleComponent | null>;
  events: PlanEvent[];
  regions: RegionResource[];
  warehouses: WarehouseResource[];
  rowAutoHeight: boolean;
  onCreated: () => void;
  onActionBegin: (args: ActionEventArgs) => void;
  onActionComplete: (args: ActionEventArgs) => void;
  onDataBound: () => void;
}

const Planner = memo(function Planner(p: PlannerProps) {
  const { schedRef } = p;

  const eventSettings = useMemo(() => ({
    dataSource: p.events,
    fields: {
      id: 'Id',
      subject: { name: 'Subject' },
      startTime: { name: 'StartTime' },
      endTime: { name: 'EndTime' },
      isAllDay: { name: 'IsAllDay' },
      isReadonly: 'IsReadonly',
    },
    allowAdding: false,
    allowDeleting: false,
    allowEditing: true,
    enableTooltip: true,
    tooltipTemplate: Tooltip,
  }), [p.events]);

  const quickInfoTemplates = useMemo(() => ({
    header: (e: PlanEvent) => (e?.Id ? (
      <div className="qi-header" style={{ background: STATUS_COLOR[e.Status] ?? '#64748b' }}>
        <div>
          <div className="qi-title">{e.Subject}</div>
          <div className="qi-sub">{e.Status}{e.Priority === 'Critical' ? ' · Critical' : ''}</div>
        </div>
        <button className="qi-close" aria-label="Close" onClick={() => schedRef.current?.closeQuickInfoPopup()}>×</button>
      </div>
    ) : <div />),
    content: QuickInfoContent,
    footer: QuickInfoFooter,
  }), [schedRef]);

  const onEventRendered = useCallback((args: EventRenderedArgs) => {
    const e = args.data as PlanEvent;
    const color = STATUS_COLOR[e.Status] ?? '#64748b';
    const el = args.element as HTMLElement;
    if (schedRef.current?.currentView === 'Agenda') {
      el.style.borderLeft = `4px solid ${color}`;
      const detail = el.querySelector('.e-date-time');
      if (detail) detail.textContent = `${e.Warehouse} · ${e.Supplier} · ${e.Status} · ${e.Priority} priority`;
    } else {
      el.style.backgroundColor = color;
    }
    el.classList.toggle('plan-critical', e.Priority === 'Critical');
    el.classList.toggle('plan-rescheduled', !!e.Rescheduled);
    el.classList.toggle('plan-cancelled', e.Status === 'Cancelled');
    el.classList.toggle('plan-locked', !!e.IsReadonly);
  }, [schedRef]);

  const onRenderCell = useCallback((args: RenderCellEventArgs) => {
    if ((args.elementType === 'workCells' || args.elementType === 'monthCells') && args.date
      && startOfDay(args.date).getTime() === startOfDay(new Date()).getTime()) {
      args.element.classList.add('plan-today');
    }
  }, []);

  const onPopupOpen = useCallback((args: PopupOpenEventArgs) => {
    // Orders come from the SCM system: no editor, and no "add event" popup on empty cells.
    if (args.type === 'Editor') args.cancel = true;
    if (args.type === 'QuickInfo' && !(args.data as Partial<PlanEvent> | undefined)?.Id) args.cancel = true;
  }, []);

  return (
    <ScheduleComponent
      ref={schedRef}
      id="scm-planner"
      height={SCHEDULE_HEIGHT}
      currentView="TimelineWeek"
      firstDayOfWeek={1}
      rowAutoHeight={p.rowAutoHeight}
      allowResizing={false}
      showQuickInfo
      eventSettings={eventSettings}
      quickInfoTemplates={quickInfoTemplates}
      created={p.onCreated}
      actionBegin={p.onActionBegin}
      actionComplete={p.onActionComplete}
      dataBound={p.onDataBound}
      eventRendered={onEventRendered}
      renderCell={onRenderCell}
      popupOpen={onPopupOpen}
    >
      <ResourcesDirective>
        <ResourceDirective field="RegionId" title="Region" name="Regions" dataSource={p.regions} textField="Text" idField="Id" />
        <ResourceDirective
          field="WarehouseId" title="Warehouse" name="Warehouses" dataSource={p.warehouses}
          textField="Text" idField="Id" groupIDField="RegionId"
        />
      </ResourcesDirective>
      <ViewsDirective>
        <ViewDirective option="TimelineWeek" displayName="Week by warehouse" group={GROUP_BY_WAREHOUSE} timeScale={NO_TIME_SCALE} />
        <ViewDirective option="TimelineMonth" displayName="Month by warehouse" group={GROUP_BY_WAREHOUSE} />
        <ViewDirective option="Month" />
        <ViewDirective option="Agenda" />
      </ViewsDirective>
      <Inject services={[TimelineViews, TimelineMonth, Month, Agenda, DragAndDrop]} />
    </ScheduleComponent>
  );
});

// ---------- Page ----------

export default function SchedulePage() {
  const schedRef = useRef<ScheduleComponent | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const originalsRef = useRef(new Map<number, ScheduleOrder>());
  const renderStartRef = useRef<number | null>(null);
  const requestsRef = useRef(0);
  const noticeTimer = useRef<number | undefined>(undefined);

  const [resources, setResources] = useState<ScheduleResources | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventFilters>({ regions: [], statuses: [], priorities: [] });
  const filtersRef = useRef(filters);
  const [events, setEvents] = useState<PlanEvent[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [rescheduled, setRescheduled] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);
  const [rowAutoHeight, setRowAutoHeight] = useState(false);

  const warehouseById = useMemo(() => new Map((resources?.warehouses ?? []).map((w) => [w.Id, w])), [resources]);
  const warehouseByIdRef = useRef(warehouseById);
  useEffect(() => { warehouseByIdRef.current = warehouseById; }, [warehouseById]);

  const notify = useCallback((kind: 'ok' | 'error', text: string) => {
    setNotice({ kind, text });
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 7000);
  }, []);

  useEffect(() => () => { window.clearTimeout(noticeTimer.current); abortRef.current?.abort(); }, []);

  useEffect(() => {
    getScheduleResources().then(setResources).catch((e: Error) => setLoadError(e.message));
  }, []);

  /** Loads only the orders delivering inside the dates the current view shows. */
  const fetchRange = useCallback(async () => {
    const view = schedRef.current?.activeView;
    if (!view) return;
    const start = startOfDay(view.startDate());
    // endDate() is exclusive (midnight after the last visible day); guard against a non-midnight value.
    const rawEnd = view.endDate();
    const end = rawEnd.getTime() === startOfDay(rawEnd).getTime() ? rawEnd : addDays(startOfDay(rawEnd), 1);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    const t0 = performance.now();
    try {
      const res = await getScheduleEvents(start, end, filtersRef.current, ctrl.signal);
      const roundTripMs = performance.now() - t0;
      requestsRef.current += 1;
      originalsRef.current = new Map(res.result.map((o) => [o.Id, o]));
      renderStartRef.current = performance.now();
      setEvents(res.result.map(toPlanEvent));
      setRescheduled(res.rescheduled);
      setMetrics({
        range: `${fmtShort.format(start)} – ${fmtDay.format(addDays(end, -1))}`,
        count: res.count,
        shown: res.result.length,
        truncated: res.truncated,
        scanned: res.scanned,
        serverMs: res.serverMs,
        roundTripMs,
        renderMs: null,
        requests: requestsRef.current,
        byStatus: res.byStatus,
      });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') notify('error', `Couldn't load orders: ${(e as Error).message}`);
    } finally {
      if (abortRef.current === ctrl) setLoading(false);
    }
  }, [notify]);

  // Re-query when filters change (the first load happens in the Scheduler's `created`).
  useEffect(() => {
    filtersRef.current = filters;
    if (schedRef.current?.activeView) fetchRange();
  }, [filters, fetchRange]);

  const onActionComplete = useCallback((args: ActionEventArgs) => {
    if (args.requestType === 'dateNavigate' || args.requestType === 'viewNavigate') fetchRange();
  }, [fetchRange]);

  const onDataBound = useCallback(() => {
    if (renderStartRef.current == null) return;
    const renderMs = performance.now() - renderStartRef.current;
    renderStartRef.current = null;
    setMetrics((m) => (m ? { ...m, renderMs } : m));
  }, []);

  /** Drag & drop: validate on the client, apply optimistically, persist, roll back on failure. */
  const onActionBegin = useCallback((args: ActionEventArgs) => {
    if (args.requestType !== 'eventChange') return;
    const ev = ((args.changedRecords?.[0] ?? args.data) as unknown) as PlanEvent;
    const orig = originalsRef.current.get(ev.Id);
    if (!orig) return;

    const wh = warehouseByIdRef.current.get(Number(ev.WarehouseId));
    if (!wh) { args.cancel = true; return; }
    if (wh.RegionId !== orig.RegionId) {
      args.cancel = true;
      notify('error', `#${ev.Id} belongs to ${orig.Region}. Orders can only move between warehouses in the same region.`);
      return;
    }
    const date = toYmd(ev.StartTime);
    if (date < orig.OrderDate) {
      args.cancel = true;
      notify('error', `#${ev.Id} can't be delivered before its order date (${dayLabel(orig.OrderDate)}).`);
      return;
    }
    if (date === orig.Date && wh.Id === orig.WarehouseId) return;

    // Keep the record consistent with where it was dropped.
    const start = fromYmd(date);
    Object.assign(ev, {
      Date: date, StartTime: start, EndTime: addDays(start, 1), IsAllDay: true,
      RegionId: orig.RegionId, WarehouseId: wh.Id, Warehouse: wh.Text, Rescheduled: true,
    });

    rescheduleOrder(ev.Id, date, wh.Id)
      .then((res) => {
        originalsRef.current.set(ev.Id, res.event);
        setRescheduled(res.rescheduled);
        const live = (schedRef.current?.eventSettings.dataSource as PlanEvent[] | undefined)?.find((x) => x.Id === ev.Id);
        if (live) {
          Object.assign(live, { Rescheduled: res.event.Rescheduled, LeadTimeDays: res.event.LeadTimeDays });
          schedRef.current?.refreshEvents();
        }
        notify('ok', `Order #${ev.Id} moved to ${dayLabel(date)} · ${res.event.Warehouse}.`);
      })
      .catch((e: Error) => {
        notify('error', `Couldn't reschedule #${ev.Id}: ${e.message}`);
        fetchRange(); // roll back to the server's view
      });
  }, [fetchRange, notify]);

  const onReset = async () => {
    try {
      const r = await resetSchedule();
      notify('ok', `Restored ${r.restored} rescheduled order${r.restored === 1 ? '' : 's'} to their original plan.`);
      fetchRange();
    } catch (e) {
      notify('error', `Reset failed: ${(e as Error).message}`);
    }
  };

  const regions = useMemo(() => {
    const all = resources?.regions ?? [];
    return filters.regions.length ? all.filter((r) => filters.regions.includes(r.Text)) : all;
  }, [resources, filters.regions]);
  const warehouses = useMemo(() => {
    const ids = new Set(regions.map((r) => r.Id));
    return (resources?.warehouses ?? []).filter((w) => ids.has(w.RegionId));
  }, [resources, regions]);

  const setFilter = (key: keyof EventFilters) => (e: { value: unknown }) =>
    setFilters((f) => ({ ...f, [key]: ((e.value as string[] | null) ?? []).slice() }));

  const actions = (
    <div className="plan-actions">
      <button className="btn-secondary" onClick={() => fetchRange()} disabled={loading}>Refresh</button>
      <button className="btn-secondary" onClick={onReset} disabled={!rescheduled} title="Put every rescheduled order back to its original date and warehouse">
        Reset changes{rescheduled ? ` (${rescheduled})` : ''}
      </button>
    </div>
  );

  if (loadError) {
    return (
      <div className="page">
        <PageHeader module={MODULE} />
        <div className="form-error">Couldn't load planning resources: {loadError}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader module={MODULE} actions={actions} />

      <div className="plan-toolbar">
        <div className="plan-filter">
          <label htmlFor="flt-region">Region</label>
          <MultiSelectComponent
            id="flt-region" dataSource={resources?.regions.map((r) => r.Text) ?? []} mode="CheckBox"
            placeholder="All regions" showSelectAll showDropDownIcon change={setFilter('regions')} width={220}
          >
            <DropDownInject services={[CheckBoxSelection]} />
          </MultiSelectComponent>
        </div>
        <div className="plan-filter">
          <label htmlFor="flt-status">Status</label>
          <MultiSelectComponent
            id="flt-status" dataSource={resources?.statuses ?? []} mode="CheckBox"
            placeholder="All statuses" showSelectAll showDropDownIcon change={setFilter('statuses')} width={220}
          >
            <DropDownInject services={[CheckBoxSelection]} />
          </MultiSelectComponent>
        </div>
        <div className="plan-filter">
          <label htmlFor="flt-priority">Priority</label>
          <MultiSelectComponent
            id="flt-priority" dataSource={resources?.priorities ?? []} mode="CheckBox"
            placeholder="All priorities" showSelectAll showDropDownIcon change={setFilter('priorities')} width={200}
          >
            <DropDownInject services={[CheckBoxSelection]} />
          </MultiSelectComponent>
        </div>
        <label className="plan-check">
          <input type="checkbox" checked={rowAutoHeight} onChange={(e) => setRowAutoHeight(e.target.checked)} />
          Show every order in timeline rows
        </label>
      </div>

      <div className="stats-bar plan-stats" aria-live="polite">
        {metrics ? (
          <>
            <span>Range <b>{metrics.range}</b></span>
            <span>Orders <b>{fmtNum.format(metrics.count)}</b>{metrics.truncated ? ` (showing ${fmtNum.format(metrics.shown)})` : ''} of {fmtNum.format(metrics.scanned)}</span>
            <span>Server <b>{metrics.serverMs.toFixed(1)} ms</b></span>
            <span>Round trip <b>{Math.round(metrics.roundTripMs)} ms</b></span>
            <span>Render <b>{metrics.renderMs == null ? '…' : `${Math.round(metrics.renderMs)} ms`}</b></span>
            <span>Requests <b>{metrics.requests}</b></span>
            <span>Rescheduled <b>{rescheduled}</b></span>
          </>
        ) : <span>Loading orders…</span>}
        {loading && <span className="spinner small" role="status" aria-label="Loading" />}
      </div>

      <div className="plan-legend">
        {(resources?.statuses ?? []).map((s) => (
          <span key={s} className="legend-item">
            <span className="legend-dot" style={{ background: STATUS_COLOR[s] }} />
            {s} <b>{fmtNum.format(metrics?.byStatus[s] ?? 0)}</b>
            {resources?.lockedStatuses.includes(s) && <span className="legend-lock" title="Locked – can't be rescheduled">locked</span>}
          </span>
        ))}
        <span className="legend-item"><span className="legend-swatch critical" />Critical priority</span>
        <span className="legend-item"><span className="legend-swatch rescheduled" />Rescheduled</span>
      </div>

      {notice && <div className={`plan-notice ${notice.kind}`} role="status">{notice.text}</div>}

      <div className="card plan-card">
        {resources ? (
          <Planner
            schedRef={schedRef}
            events={events}
            regions={regions}
            warehouses={warehouses}
            rowAutoHeight={rowAutoHeight}
            onCreated={fetchRange}
            onActionBegin={onActionBegin}
            onActionComplete={onActionComplete}
            onDataBound={onDataBound}
          />
        ) : (
          <div className="page-loader" role="status"><span className="spinner" /><span>Loading warehouses…</span></div>
        )}
      </div>
    </div>
  );
}
