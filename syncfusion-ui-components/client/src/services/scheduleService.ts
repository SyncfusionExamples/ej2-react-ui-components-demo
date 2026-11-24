import { apiFetch } from './api';

/** One SCM order as the server sends it for the Scheduler (dates are 'YYYY-MM-DD'). */
export interface ScheduleOrder {
  Id: number;
  Date: string;
  OrderDate: string;
  Product: string;
  Category: string;
  Quantity: number;
  Amount: number;
  Supplier: string;
  Region: string;
  Warehouse: string;
  RegionId: number;
  WarehouseId: number;
  Status: string;
  Priority: string;
  ShipMode: string;
  LeadTimeDays: number;
  IsReadonly: boolean;
  Rescheduled: boolean;
}

/** The same order shaped as an all-day Scheduler appointment. */
export interface PlanEvent extends ScheduleOrder {
  Subject: string;
  StartTime: Date;
  EndTime: Date;
  IsAllDay: true;
}

export interface RegionResource { Id: number; Text: string }
export interface WarehouseResource { Id: number; Text: string; RegionId: number }

export interface ScheduleResources {
  regions: RegionResource[];
  warehouses: WarehouseResource[];
  statuses: string[];
  priorities: string[];
  lockedStatuses: string[];
}

export interface EventsResponse {
  result: ScheduleOrder[];
  count: number;
  truncated: boolean;
  byStatus: Record<string, number>;
  rescheduled: number;
  scanned: number;
  serverMs: number;
}

export interface EventFilters { regions: string[]; statuses: string[]; priorities: string[] }

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day as 'YYYY-MM-DD' (no UTC shift). */
export const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 'YYYY-MM-DD' as local midnight, so the order lands on the same day in every time zone. */
export function fromYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toPlanEvent(o: ScheduleOrder): PlanEvent {
  const start = fromYmd(o.Date);
  return {
    ...o,
    Subject: `#${o.Id} · ${o.Product} × ${o.Quantity}`,
    StartTime: start,
    EndTime: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1),
    IsAllDay: true,
  };
}

export const getScheduleResources = () => apiFetch<ScheduleResources>('/schedule/resources');

/** Orders delivering in [start, end) – only the visible range is requested. */
export function getScheduleEvents(start: Date, end: Date, f: EventFilters, signal?: AbortSignal) {
  const q = new URLSearchParams({ start: toYmd(start), end: toYmd(end) });
  if (f.regions.length) q.set('regions', f.regions.join(','));
  if (f.statuses.length) q.set('statuses', f.statuses.join(','));
  if (f.priorities.length) q.set('priorities', f.priorities.join(','));
  return apiFetch<EventsResponse>(`/schedule/events?${q}`, { signal });
}

export const rescheduleOrder = (id: number, date: string, warehouseId: number) =>
  apiFetch<{ event: ScheduleOrder; rescheduled: number }>(`/schedule/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ date, warehouseId }),
  });

export const resetSchedule = () => apiFetch<{ restored: number; rescheduled: number }>('/schedule/reset', { method: 'POST' });
