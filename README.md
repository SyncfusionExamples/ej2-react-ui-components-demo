# Syncfusion React UI Components 

A React 19 + Vite + TypeScript single-page application that demonstrates **every major Syncfusion Essential JS 2 (v35.2.12) React component** end-to-end. A small Express mock API feeds each page with realistic data so each component can be exercised as it would be in a real product — sorting, filtering, paging, virtualization, drill-down, drag-and-drop, custom binding, server-side aggregation, etc.

The application is themed around supply chain analytics (orders, suppliers, warehouses, deliveries, network flows), but every page is a self-contained component showcase: switch the data, the same UI patterns apply to any domain.

## Highlights

* **JWT login** (`admin` / `admin`) with protected routes, automatic logout on token expiry, and logout on any 401 from the API.
* **Lazy-loaded routes** so each Syncfusion package (and its CSS) is downloaded only when the user opens that page.
* **Dashboard** with KPI tiles and module cards linking to every component page.
* **10 component pages** — one route per Syncfusion component (see *Components* below).
* **Mock API** in `server/` provides seeded data, query engine, distinct-value lookup, server-side aggregation, and a reschedulable planning calendar.
* **Performance-first** server query engine that compiles `where` predicates into index-based tests, pre-computes numeric sort ranks, and caches filtered+sorted views in an LRU (see *Performance notes*).

## Components

Each component lives on its own lazy route and is wired to data that exercises its most important features. The sidebar lists them in display order.

| Route | Component | Package | What's shown |
|---|---|---|---|
| `/dashboard` | Dashboard / KPI tiles | `@syncfusion/ej2-react-buttons` | Summary KPIs and module cards |
| `/grid` | Data Grid | `@syncfusion/ej2-react-grids` | 1,00,000 records, **custom data binding** (`dataStateChange`), multi-column sort, Excel checkbox filter, virtual scrolling |
| `/pivot` | Pivot Table | `@syncfusion/ej2-react-pivotview` | Server-side pre-aggregated rows, grouping bar, field list, virtual scroll, paging |
| `/chart` | Charts | `@syncfusion/ej2-react-charts` | Column + line + spline on shared/secondary axes, strip lines, zoom/pan/scrollbar on a 100k+ point series |
| `/maps` | Maps | `@syncfusion/ej2-react-maps` | World layer with navigation lines (network flows), markers, tooltips, antimeridian-corrected great-circle paths |
| `/treemap` | Tree Map | `@syncfusion/ej2-react-treemap` | Hierarchical inventory visualisation with drill-down, breadcrumb, range colour mapping, legend |
| `/heatmap` | Heat Map | `@syncfusion/ej2-react-heatmap` | SVG vs. Canvas rendering modes, gradient palette, cell selection, custom tooltip, scales from 500 to 52k cells |
| `/sankey` | Sankey | `@syncfusion/ej2-react-charts` | Multi-tier flow diagram, node filtering, click-through flow balance, link highlight on hover |
| `/gantt` | Gantt | `@syncfusion/ej2-react-gantt` | Project plan with predecessors, critical path, baseline tracking, resource view |
| `/schedule` | Schedule | `@syncfusion/ej2-react-schedule` | Delivery calendar (day/week/month/timeline/agenda), grouped by Region → Warehouse, drag-and-drop reschedule, custom quick-info popup |
| `/diagram` | Diagram | `@syncfusion/ej2-react-diagrams` | Org-chart / mind-map / hierarchical-tree layouts, zoom & fit-to-page, overview window, PNG/JPG/SVG export |

## Run it

Requires **Node 18** or later.

```bash
cd syncfusion-ui-components

npm run install:all      # installs root, server and client
# optional: add your key in client/.env  ->  VITE_SYNCFUSION_LICENSE=xxxx
npm run dev              # API on :5000 + React on http://localhost:5173
```

Or use two terminals: `cd server && npm start`, then `cd client && npm run dev`.

Production build: `npm run build`, then `npm run preview` (http://localhost:4173).

> Without a license key, Syncfusion shows a trial banner at the top of the page. Copy `client/.env.example` to `client/.env` and set `VITE_SYNCFUSION_LICENSE`.

## Project layout

```
syncfusion-ui-components/
  server/                         Express mock API
    data.js                       seeded generator for 1,00,000 demo records
    query.js                      where / sorted / skip / take engine + LRU view cache
    schedule.js                   reschedulable planning calendar on the same records
    server.js                     /api/auth/*, /api/orders, /api/orders/distinct,
                                  /api/pivot, /api/summary, /api/schedule/*
  client/src/
    auth/                         AuthContext (token, expiry timer), ProtectedRoute / PublicOnlyRoute
    services/                     api.ts (fetch + Bearer), scmService.ts, scheduleService.ts
    layout/AppLayout.tsx          header, sidebar, lazy-route Suspense, error boundary
    components/                   PageHeader, modules/icons, viz helpers, ErrorBoundary
    data/                         client-side sample data (sites, lanes, flows, inventory…)
    pages/
      LoginPage.tsx               /login
      DashboardPage.tsx           /dashboard
      DataGridPage.tsx            /grid
      PivotPage.tsx               /pivot
      ChartPage.tsx               /chart
      MapsPage.tsx                /maps
      TreeMapPage.tsx             /treemap
      HeatMapPage.tsx             /heatmap
      SankeyPage.tsx              /sankey
      GanttPage.tsx               /gantt
      SchedulePage.tsx            /schedule
      DiagramPage.tsx             /diagram
  scripts/prepare-azure-deploy.cjs   builds and prepares a deployable bundle
```

## Architecture

* **Auth**: `AuthContext` stores the JWT, expiry timestamp, and user. A timer logs the user out one minute before expiry; every API call sends `Authorization: Bearer <token>` and a 401 forces logout. `ProtectedRoute` redirects unauthenticated users to `/login`; `PublicOnlyRoute` redirects authenticated users away from it.
* **Routing**: `react-router-dom` v7 with `<Routes>` and nested layouts. Component pages are imported via `React.lazy()` so each Syncfusion package is fetched only when its route is opened.
* **Theming**: All pages consume a shared `THEME` constant and a small `viz.tsx` helper (card chrome, render-time readout, number formatting, palette) so the demo looks consistent.
* **Data**: Two sources — (1) the server API for the Grid, Pivot, Chart-series-on-API and the Schedule, and (2) generated client-side samples for the visual-only pages (Maps, Tree Map, Heat Map, Sankey, Diagram).
* **Performance budget**: lazy loading, gzip compression on the API, no blocking Google Fonts (the `@import` is stripped from the Syncfusion theme CSS — see *Performance notes*).

## API surface

All endpoints are namespaced under `/ej2-ui-components/api/*` (so the SPA can sit on any base path). Every endpoint except `/auth/login` and `/health` requires `Authorization: Bearer <token>`.

| Method | Path | Body / Query | Response |
|---|---|---|---|
| `POST` | `/api/auth/login` | `{ username, password }` | `{ token, expiresAt, user }` |
| `GET`  | `/api/auth/me` | — | `{ user }` |
| `POST` | `/api/orders` | `{ skip, take, sorted, where }` | `{ result, count, serverMs }` |
| `POST` | `/api/orders/distinct` | `{ field, where, take }` | array of distinct values |
| `GET`  | `/api/pivot` | — | `{ rows, sourceCount, buildMs }` |
| `GET`  | `/api/summary` | — | `{ totalOrders, totalAmount, delivered, delayed, monthly, byCategory, byStatus }` |
| `GET`  | `/api/schedule/resources` | — | `{ regions, warehouses }` |
| `GET`  | `/api/schedule/events` | `?from&to&regions&warehouses&statuses&priorities&shipModes` | `{ events, scanned, truncated, range }` |
| `PUT`  | `/api/schedule/events/:id` | `{ date, warehouseId }` | updated event |
| `GET`  | `/api/schedule/changes` | — | list of reschedule actions |
| `POST` | `/api/schedule/reset` | — | revert all reschedules |
| `GET`  | `/api/health` | — | `{ ok, records }` |

## Component-specific notes

### Data Grid — custom binding
1. On mount the page requests `{ skip: 0, take: 100 }` and assigns `{ result, count }` to `grid.dataSource`.
2. Every sort / filter / scroll action raises `dataStateChange(state)`. The page posts `skip`, `take`, `sorted` and `where` to `POST /api/orders` and assigns the response.
3. For the Excel filter checkbox list (`filterchoicerequest` / `filterSearchBegin`), the page calls `POST /api/orders/distinct`, sending the other columns' active filters too, so the list shows only values that still exist for the current filter state.
4. Out-of-order responses are dropped — fast sorting, filtering or scrolling never shows stale rows.

### Pivot Table
The same 1L records are pre-aggregated on the server by `Region × Category × Product × Year × Quarter × Status` (about 10.6k rows). Drag fields between the grouping bar and the field list to re-pivot.

### Chart
Two stacked examples: a small multi-axis `Column + Line + Spline` chart with an OTIF target strip line, and a `100k`-point line chart that exercises zoom / pan / scrollbar.

### Maps
Markers are styled by tier (Supplier ◆, Plant ■, DC ●). Lanes are drawn as navigation lines; lane width is proportional to volume; trans-Pacific lanes are split at the antimeridian. A toggle simulates Rotterdam port disruption, recolouring affected lanes red and pulsing the marker.

### Tree Map
Switches between `Region → DC → Category` and `Category → Region → DC` hierarchies. Leaves are coloured by days-of-supply bands (stock-out / healthy / excess) with drill-down and breadcrumb navigation.

### Heat Map
Three size presets (500 → 10.4k → 52k cells). Smaller matrices render with SVG and visible cell labels; larger ones switch to Canvas with no labels. Cells below the 80% OTIF threshold are flagged.

### Sankey
Click any node to see its inbound/outbound flow balance; the *Stages* dropdown restricts the visible flow to upstream or downstream tiers.

### Gantt
A dummy DC rollout plan with task hierarchy, FS predecessors, critical path, baseline bars and per-task resources. Date arithmetic is relative to "today" so the demo stays current.

### Schedule
Region → Warehouse grouping; multi-view (Day/Week/Month/Timeline/Agenda); drag-and-drop reschedule via `PUT /api/schedule/events/:id` (history dates are locked); server tracks all changes and the page can `POST /schedule/reset` to restore them. Reschedules invalidate Grid/Pivot/Chart caches so all pages stay consistent.

### Diagram
Three layout engines (Organisational Chart, Hierarchical Tree, Mind Map) with orientation controls, an overview window, zoom & fit-to-page, and PNG/JPG/SVG export via the toolbar.

## Configuration

| Variable | Where | Default |
|---|---|---|
| `VITE_SYNCFUSION_LICENSE` | `client/.env` | (empty — shows trial banner) |
| `VITE_API_URL` | `client/.env` | `/api` (Vite proxies to `:5000`) |
| `PORT` | server env | `5000` |
| `JWT_SECRET` | server env | demo secret (override in production) |
| `TOKEN_TTL` | server env | `1h` |
| `RECORD_COUNT` | server env | `100000` |

## Tech stack

* **React 19** + **Vite 8** + **TypeScript 7**
* **react-router-dom 7** for routing
* **Syncfusion Essential JS 2 35.2.12** (React wrappers): base, buttons, charts, diagrams, dropdowns, gantt, grids, heatmap, inputs, maps, navigations, pivotview, popups, schedule, splitbuttons, treemap + Tailwind 3 theme
* **Express 5** + **jsonwebtoken** + **compression** + **cors** on the server
* **concurrently** at the root for `dev` / `preview`
