import type { DataStateChangeEventArgs } from '@syncfusion/ej2-react-grids';
import { apiFetch } from './api';

export interface ScmOrder {
  OrderID: number;
  OrderDate: Date;
  DeliveryDate: Date;
  Supplier: string;
  Category: string;
  Product: string;
  Region: string;
  Warehouse: string;
  Quantity: number;
  UnitPrice: number;
  Amount: number;
  Status: string;
  ShipMode: string;
  Priority: string;
  LeadTimeDays: number;
}

export interface OrdersResponse { result: ScmOrder[]; count: number; serverMs: number; cached: boolean }

export interface PivotRow {
  Region: string; Category: string; Product: string; Year: string; Quarter: string; Status: string;
  Orders: number; Quantity: number; Amount: number;
}

export interface Summary {
  totalOrders: number; totalAmount: number; delayed: number; delivered: number;
  monthly: { month: string; amount: number }[];
  byCategory: { category: string; amount: number }[];
  byStatus: { status: string; count: number }[];
}

// Server returns ISO strings; the grid's date columns need Date objects.
function reviveDates(rows: ScmOrder[]): ScmOrder[] {
  for (const r of rows) {
    r.OrderDate = new Date(r.OrderDate as unknown as string);
    r.DeliveryDate = new Date(r.DeliveryDate as unknown as string);
  }
  return rows;
}

/** Sends the grid's state (skip, take, sorted, where) to the server. */
export async function getOrders(state: DataStateChangeEventArgs, signal?: AbortSignal): Promise<OrdersResponse> {
  const body = {
    skip: state.skip ?? 0,
    take: state.take ?? 50,
    sorted: state.sorted ?? [],
    where: state.where ?? [],
  };
  const res = await apiFetch<OrdersResponse>('/orders', { method: 'POST', body: JSON.stringify(body), signal });
  reviveDates(res.result);
  return res;
}

/** Distinct values for the Excel-like filter checkbox list. */
export async function getDistinct(field: string, where: unknown, take = 1000, skip = 0): Promise<{ result: ScmOrder[]; count: number }> {
  const res = await apiFetch<{ result: ScmOrder[]; count: number }>('/orders/distinct', {
    method: 'POST',
    body: JSON.stringify({ field, where: where ?? [], take, skip }),
  });
  reviveDates(res.result);
  return res;
}

export const getPivotData = () =>
  apiFetch<{ rows: PivotRow[]; sourceCount: number; buildMs: number }>('/pivot');

export const getSummary = () => apiFetch<Summary>('/summary');
