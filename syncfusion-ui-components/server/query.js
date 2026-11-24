// Server-side query engine for the Syncfusion Grid "custom binding" state
// (skip / take / sorted / where). Works on index arrays (no object copies) and
// caches filtered+sorted views so virtual-scroll page requests are O(take).

const { ORDERS, DATE_FIELDS, DATE_CACHE } = require('./data');

const ALL_INDEXES = Int32Array.from(ORDERS, (_, i) => i);
const viewCache = new Map(); // key -> Int32Array
const MAX_CACHE = 30;

const fieldValue = (i, field) => (DATE_FIELDS.has(field) ? DATE_CACHE[field][i] : ORDERS[i][field]);

function normalise(value, field, ignoreCase) {
  if (value === null || value === undefined) return value;
  if (DATE_FIELDS.has(field)) return typeof value === 'number' ? value : Date.parse(value);
  if (typeof value === 'string' && ignoreCase) return value.toLowerCase();
  return value;
}

// Converts a (serialised) Syncfusion Predicate into a fast test function.
function compilePredicate(p) {
  if (!p) return () => true;
  if (p.isComplex || Array.isArray(p.predicates)) {
    const parts = (p.predicates || []).map(compilePredicate);
    if (!parts.length) return () => true;
    return (p.condition || 'and').toLowerCase() === 'or'
      ? (i) => parts.some((fn) => fn(i))
      : (i) => parts.every((fn) => fn(i));
  }

  const field = p.field;
  const op = String(p.operator || 'equal').toLowerCase();
  const ignoreCase = p.ignoreCase !== false && !p.matchCase;
  const target = normalise(p.value, field, ignoreCase);
  const targets = Array.isArray(p.value) ? p.value.map((v) => normalise(v, field, ignoreCase)) : null;
  const get = (i) => normalise(fieldValue(i, field), field, ignoreCase);
  const str = (v) => (v === null || v === undefined ? '' : String(v));

  switch (op) {
    case 'equal': return target === null ? (i) => get(i) == null : (i) => get(i) === target;
    case 'notequal': return target === null ? (i) => get(i) != null : (i) => get(i) !== target;
    case 'lessthan': return (i) => get(i) < target;
    case 'lessthanorequal': return (i) => get(i) <= target;
    case 'greaterthan': return (i) => get(i) > target;
    case 'greaterthanorequal': return (i) => get(i) >= target;
    case 'contains': return (i) => str(get(i)).includes(str(target));
    case 'doesnotcontain': return (i) => !str(get(i)).includes(str(target));
    case 'startswith': return (i) => str(get(i)).startsWith(str(target));
    case 'doesnotstartwith': return (i) => !str(get(i)).startsWith(str(target));
    case 'endswith': return (i) => str(get(i)).endsWith(str(target));
    case 'doesnotendwith': return (i) => !str(get(i)).endsWith(str(target));
    case 'isnull': return (i) => get(i) == null;
    case 'isnotnull': return (i) => get(i) != null;
    case 'isempty': return (i) => str(get(i)) === '';
    case 'isnotempty': return (i) => str(get(i)) !== '';
    case 'in': { const s = new Set(targets || [target]); return (i) => s.has(get(i)); }
    case 'notin': { const s = new Set(targets || [target]); return (i) => !s.has(get(i)); }
    case 'like':
    case 'wildcard': {
      const pattern = str(target).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/%/g, '.*').replace(/\?/g, '.');
      const re = new RegExp(op === 'like' ? pattern : `^${pattern}$`, ignoreCase ? 'i' : '');
      return (i) => re.test(str(get(i)));
    }
    default: return () => true;
  }
}

function filterIndexes(where) {
  const list = Array.isArray(where) ? where : where ? [where] : [];
  if (!list.length) return ALL_INDEXES;
  const tests = list.map(compilePredicate);
  const out = [];
  for (let i = 0; i < ORDERS.length; i++) {
    let ok = true;
    for (let t = 0; t < tests.length; t++) if (!tests[t](i)) { ok = false; break; }
    if (ok) out.push(i);
  }
  return Int32Array.from(out);
}

// Numeric sort keys per field (built once, lazily): numbers/dates as-is, strings as
// their ordinal rank, so multi-column sorts on 1L rows compare typed-array numbers only.
const sortKeyCache = new Map();
function sortKeys(field) {
  let keys = sortKeyCache.get(field);
  if (keys) return keys;
  if (DATE_FIELDS.has(field)) keys = DATE_CACHE[field];
  else if (typeof ORDERS[0][field] === 'number') keys = Float64Array.from(ORDERS, (o) => o[field]);
  else {
    const unique = [...new Set(ORDERS.map((o) => o[field]))].sort((a, b) => String(a).localeCompare(String(b)));
    const rank = new Map(unique.map((v, i) => [v, i]));
    keys = Float64Array.from(ORDERS, (o) => rank.get(o[field]));
  }
  sortKeyCache.set(field, keys);
  return keys;
}

function sortIndexes(indexes, sorted) {
  if (!sorted || !sorted.length) return indexes;
  const keys = sorted
    .filter((s) => (s.name || s.field) in ORDERS[0])
    .map((s) => ({ values: sortKeys(s.name || s.field), dir: String(s.direction).toLowerCase().startsWith('desc') ? -1 : 1 }));
  const copy = Int32Array.from(indexes);
  copy.sort((a, b) => {
    for (let k = 0; k < keys.length; k++) {
      const v = keys[k].values;
      const d = v[a] - v[b];
      if (d !== 0) return d * keys[k].dir;
    }
    return a - b;
  });
  return copy;
}

function getView(where, sorted) {
  const key = JSON.stringify([where || null, sorted || null]);
  let view = viewCache.get(key);
  if (view) {
    viewCache.delete(key);
    viewCache.set(key, view); // refresh LRU position
    return { view, cached: true };
  }
  view = sortIndexes(filterIndexes(where), sorted);
  viewCache.set(key, view);
  if (viewCache.size > MAX_CACHE) viewCache.delete(viewCache.keys().next().value);
  return { view, cached: false };
}

// Grid sends `sorted` with the most recently sorted column first; the grid shows
// the first-clicked column as sort priority 1, so reverse to apply that order.
function normaliseSorted(sorted) {
  return Array.isArray(sorted) && sorted.length ? [...sorted].reverse() : null;
}

function queryOrders({ skip = 0, take = 50, sorted, where }) {
  const t0 = process.hrtime.bigint();
  const { view, cached } = getView(where, normaliseSorted(sorted));
  const s = Math.max(0, Number(skip) || 0);
  const t = Math.min(1000, Math.max(1, Number(take) || 50));
  const result = [];
  for (let i = s; i < Math.min(s + t, view.length); i++) result.push(ORDERS[view[i]]);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { result, count: view.length, serverMs: Math.round(ms * 100) / 100, cached };
}

// Distinct values for the Excel/checkbox filter popup. Returns one full record per
// distinct value (the grid re-applies the other columns' filters on this list).
function distinctValues({ field, where, take = 1000, skip = 0 }) {
  const { view } = getView(where, null);
  const seen = new Set();
  const distinct = [];
  for (let i = 0; i < view.length; i++) {
    const row = ORDERS[view[i]];
    const v = row[field];
    if (!seen.has(v)) { seen.add(v); distinct.push(row); }
  }
  const s = Math.max(0, Number(skip) || 0);
  const t = Math.min(1000, Math.max(1, Number(take) || 1000));
  return { result: distinct.slice(s, s + t), count: distinct.length };
}

module.exports = { queryOrders, distinctValues };
