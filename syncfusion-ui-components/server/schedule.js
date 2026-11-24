// Scheduler (delivery planning) API over the same in-memory SCM orders the Grid uses.
// Orders carry a delivery *date* only, so each order is an all-day appointment on its
// DeliveryDate, placed on its warehouse. Dates travel as 'YYYY-MM-DD' strings so the
// calendar day is the same in every browser time zone.
//
// Rescheduling changes the in-memory records (DeliveryDate, Warehouse, LeadTimeDays) and
// is lost when the server restarts. Originals are remembered so changes can be reset.

const { ORDERS, DATE_CACHE } = require('./data');

const DAY = 86400000;
const MAX_EVENTS = 20000;
const LOCKED_STATUSES = new Set(['Delivered', 'Cancelled']); // history: not re-plannable
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------- Resources (Region -> Warehouse), derived from the data ----------
const regionNames = [...new Set(ORDERS.map((o) => o.Region))].sort();
const REGIONS = regionNames.map((name, i) => ({ Id: i + 1, Text: name }));
const regionIdByName = new Map(REGIONS.map((r) => [r.Text, r.Id]));

const warehousePairs = new Map(); // warehouse -> region
for (const o of ORDERS) if (!warehousePairs.has(o.Warehouse)) warehousePairs.set(o.Warehouse, o.Region);
const WAREHOUSES = [...warehousePairs.entries()]
  .sort(([wa, ra], [wb, rb]) => ra.localeCompare(rb) || wa.localeCompare(wb))
  .map(([name, region], i) => ({ Id: i + 1, Text: name, RegionId: regionIdByName.get(region) }));
const warehouseIdByName = new Map(WAREHOUSES.map((w) => [w.Text, w.Id]));
const warehouseById = new Map(WAREHOUSES.map((w) => [w.Id, w]));

const STATUSES = ['Delivered', 'Shipped', 'In Transit', 'Processing', 'Delayed', 'Cancelled'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

// ---------- Change tracking ----------
const originals = new Map(); // OrderID -> { DeliveryDate, Warehouse, Region, LeadTimeDays }
const changes = new Map(); // OrderID -> { from, to, fromWarehouse, toWarehouse, by, at }

const dayOf = (iso) => iso.slice(0, 10);

function toEvent(o) {
  return {
    Id: o.OrderID,
    Date: dayOf(o.DeliveryDate),
    OrderDate: dayOf(o.OrderDate),
    Product: o.Product,
    Category: o.Category,
    Quantity: o.Quantity,
    Amount: o.Amount,
    Supplier: o.Supplier,
    Region: o.Region,
    Warehouse: o.Warehouse,
    RegionId: regionIdByName.get(o.Region),
    WarehouseId: warehouseIdByName.get(o.Warehouse),
    Status: o.Status,
    Priority: o.Priority,
    ShipMode: o.ShipMode,
    LeadTimeDays: o.LeadTimeDays,
    IsReadonly: LOCKED_STATUSES.has(o.Status),
    Rescheduled: changes.has(o.OrderID),
  };
}

const asList = (v) => (v == null || v === '' ? [] : String(v).split(',').map((s) => s.trim()).filter(Boolean));
const parseDay = (s) => (DATE_RE.test(String(s || '')) ? Date.parse(`${s}T00:00:00Z`) : NaN);

/** Orders whose delivery date is in [start, end), with optional list filters. */
function queryEvents(q) {
  const t0 = process.hrtime.bigint();
  const start = parseDay(q.start);
  const end = parseDay(q.end);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    const err = new Error('start and end are required as YYYY-MM-DD, with end after start');
    err.status = 400;
    throw err;
  }
  if (end - start > 400 * DAY) {
    const err = new Error('Date range is limited to 400 days');
    err.status = 400;
    throw err;
  }

  const regions = new Set(asList(q.regions));
  const statuses = new Set(asList(q.statuses));
  const priorities = new Set(asList(q.priorities));
  const dates = DATE_CACHE.DeliveryDate;

  const result = [];
  const byStatus = {};
  let matched = 0;
  for (let i = 0; i < ORDERS.length; i++) {
    const d = dates[i];
    if (d < start || d >= end) continue;
    const o = ORDERS[i];
    if (regions.size && !regions.has(o.Region)) continue;
    if (statuses.size && !statuses.has(o.Status)) continue;
    if (priorities.size && !priorities.has(o.Priority)) continue;
    matched++;
    byStatus[o.Status] = (byStatus[o.Status] || 0) + 1;
    if (result.length < MAX_EVENTS) result.push(toEvent(o));
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return {
    result,
    count: matched,
    truncated: matched > result.length,
    byStatus,
    rescheduled: changes.size,
    scanned: ORDERS.length,
    serverMs: Math.round(ms * 100) / 100,
  };
}

function getResources() {
  return { regions: REGIONS, warehouses: WAREHOUSES, statuses: STATUSES, priorities: PRIORITIES, lockedStatuses: [...LOCKED_STATUSES] };
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Moves one order to a new delivery date and/or warehouse (same region only). */
function rescheduleOrder(id, body, user) {
  const orderId = Number(id);
  const idx = orderId - ORDERS[0].OrderID;
  const o = ORDERS[idx];
  if (!o || o.OrderID !== orderId) throw httpError(404, `Order ${id} not found`);
  if (LOCKED_STATUSES.has(o.Status)) throw httpError(409, `Order ${orderId} is ${o.Status} and can't be rescheduled`);

  const newDate = body.date ?? dayOf(o.DeliveryDate);
  const newTime = parseDay(newDate);
  if (Number.isNaN(newTime)) throw httpError(400, 'date must be YYYY-MM-DD');
  const orderTime = DATE_CACHE.OrderDate[idx];
  if (newTime < orderTime) throw httpError(422, `Delivery can't be before the order date (${dayOf(o.OrderDate)})`);
  if (newTime - orderTime > 365 * DAY) throw httpError(422, 'Delivery must be within 365 days of the order date');

  let warehouse = o.Warehouse;
  if (body.warehouseId != null) {
    const w = warehouseById.get(Number(body.warehouseId));
    if (!w) throw httpError(400, 'Unknown warehouse');
    if (w.RegionId !== regionIdByName.get(o.Region)) {
      throw httpError(422, `${w.Text} is outside ${o.Region}; orders can only move between warehouses in the same region`);
    }
    warehouse = w.Text;
  }

  if (!originals.has(orderId)) {
    originals.set(orderId, { DeliveryDate: o.DeliveryDate, Warehouse: o.Warehouse, Region: o.Region, LeadTimeDays: o.LeadTimeDays });
  }
  const orig = originals.get(orderId);

  o.DeliveryDate = new Date(newTime).toISOString();
  o.Warehouse = warehouse;
  o.LeadTimeDays = Math.round((newTime - orderTime) / DAY);
  DATE_CACHE.DeliveryDate[idx] = newTime;

  if (o.DeliveryDate === orig.DeliveryDate && o.Warehouse === orig.Warehouse) {
    originals.delete(orderId);
    changes.delete(orderId);
  } else {
    changes.set(orderId, {
      from: dayOf(orig.DeliveryDate), to: dayOf(o.DeliveryDate),
      fromWarehouse: orig.Warehouse, toWarehouse: o.Warehouse,
      by: user?.sub, at: new Date().toISOString(),
    });
  }
  return { event: toEvent(o), rescheduled: changes.size };
}

/** Puts every rescheduled order back to its generated values. */
function resetChanges() {
  let restored = 0;
  for (const [orderId, orig] of originals) {
    const idx = orderId - ORDERS[0].OrderID;
    Object.assign(ORDERS[idx], orig);
    DATE_CACHE.DeliveryDate[idx] = Date.parse(orig.DeliveryDate);
    restored++;
  }
  originals.clear();
  changes.clear();
  return { restored, rescheduled: 0 };
}

const listChanges = () => [...changes.entries()].map(([id, c]) => ({ OrderID: id, ...c }));

module.exports = { queryEvents, getResources, rescheduleOrder, resetChanges, listChanges };
