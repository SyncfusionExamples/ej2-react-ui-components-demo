const express = require('express');
const cors = require('cors');
const compression = require('compression');
const jwt = require('jsonwebtoken');
const { ORDERS } = require('./data');
const { queryOrders, distinctValues, invalidateQueryCaches } = require('./query');
const schedule = require('./schedule');

const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || 'scm-poc-demo-secret-change-me';
const TOKEN_TTL = process.env.TOKEN_TTL || '1h';
const USERS = [{ username: 'admin', password: 'admin', name: 'Administrator', role: 'Admin' }];

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// Request timing log
app.use((req, res, next) => {
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  next();
});

// ---------- Auth ----------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = USERS.find((u) => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: 'Invalid user name or password' });
  const payload = { sub: user.username, name: user.name, role: user.role };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
  const { exp } = jwt.decode(token);
  res.json({ token, expiresAt: exp * 1000, user: payload });
});

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ message: e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' });
  }
}

app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: req.user }));

// ---------- Orders (Data Grid custom binding) ----------
app.post('/api/orders', authenticate, (req, res) => res.json(queryOrders(req.body || {})));

app.post('/api/orders/distinct', authenticate, (req, res) => {
  const { field } = req.body || {};
  if (!field || !(field in ORDERS[0])) return res.status(400).json({ message: 'Unknown field' });
  res.json(distinctValues(req.body));
});

// ---------- Pivot: server-side pre-aggregation ----------
let pivotCache = null;
function buildPivotData() {
  if (pivotCache) return pivotCache;
  const t0 = Date.now();
  const groups = new Map();
  for (const o of ORDERS) {
    const d = new Date(o.OrderDate);
    const year = String(d.getUTCFullYear());
    const quarter = 'Q' + (Math.floor(d.getUTCMonth() / 3) + 1);
    const key = `${o.Region}|${o.Category}|${o.Product}|${year}|${quarter}|${o.Status}`;
    let g = groups.get(key);
    if (!g) {
      g = { Region: o.Region, Category: o.Category, Product: o.Product, Year: year, Quarter: quarter, Status: o.Status, Orders: 0, Quantity: 0, Amount: 0 };
      groups.set(key, g);
    }
    g.Orders += 1;
    g.Quantity += o.Quantity;
    g.Amount += o.Amount;
  }
  const rows = [...groups.values()].map((g) => ({ ...g, Amount: Math.round(g.Amount * 100) / 100 }));
  pivotCache = { rows, sourceCount: ORDERS.length, buildMs: Date.now() - t0 };
  console.log(`[pivot] aggregated ${ORDERS.length} records into ${rows.length} rows in ${pivotCache.buildMs} ms`);
  return pivotCache;
}
app.get('/api/pivot', authenticate, (req, res) => res.json(buildPivotData()));

// ---------- Summary (Chart page + dashboard KPIs) ----------
let summaryCache = null;
app.get('/api/summary', authenticate, (req, res) => {
  if (!summaryCache) {
    const monthly = new Map();
    const byCategory = new Map();
    const byStatus = new Map();
    let amount = 0;
    for (const o of ORDERS) {
      const m = o.OrderDate.slice(0, 7);
      monthly.set(m, (monthly.get(m) || 0) + o.Amount);
      byCategory.set(o.Category, (byCategory.get(o.Category) || 0) + o.Amount);
      byStatus.set(o.Status, (byStatus.get(o.Status) || 0) + 1);
      amount += o.Amount;
    }
    const round = (v) => Math.round(v);
    summaryCache = {
      totalOrders: ORDERS.length,
      totalAmount: round(amount),
      delayed: byStatus.get('Delayed') || 0,
      delivered: byStatus.get('Delivered') || 0,
      monthly: [...monthly.entries()].sort().map(([month, value]) => ({ month: new Date(month + '-01T00:00:00Z').toISOString(), amount: round(value) })),
      byCategory: [...byCategory.entries()].map(([category, value]) => ({ category, amount: round(value) })).sort((a, b) => b.amount - a.amount),
      byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
    };
  }
  res.json(summaryCache);
});

// ---------- Schedule (delivery planning on the live orders) ----------
// Any change to the records clears the derived caches so Grid / Pivot / Chart stay consistent.
function invalidateDerivedCaches() {
  invalidateQueryCaches();
  pivotCache = null;
  summaryCache = null;
}

const sendError = (res, e) => res.status(e.status || 500).json({ message: e.message || 'Server error' });

app.get('/api/schedule/resources', authenticate, (req, res) => res.json(schedule.getResources()));

app.get('/api/schedule/events', authenticate, (req, res) => {
  try {
    res.json(schedule.queryEvents(req.query));
  } catch (e) {
    sendError(res, e);
  }
});

app.put('/api/schedule/events/:id', authenticate, (req, res) => {
  try {
    const out = schedule.rescheduleOrder(req.params.id, req.body || {}, req.user);
    invalidateDerivedCaches();
    res.json(out);
  } catch (e) {
    sendError(res, e);
  }
});

app.get('/api/schedule/changes', authenticate, (req, res) => res.json(schedule.listChanges()));

app.post('/api/schedule/reset', authenticate, (req, res) => {
  const out = schedule.resetChanges();
  if (out.restored) invalidateDerivedCaches();
  res.json(out);
});

app.get('/api/health', (req, res) => res.json({ ok: true, records: ORDERS.length }));

app.listen(PORT, () => {
  buildPivotData();
  console.log(`SCM mock API running on http://localhost:${PORT}  (login: admin / admin)`);
});
