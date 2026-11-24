import { lazy } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './auth/ProtectedRoute';
import AppLayout from './layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

// Component pages are lazy-loaded so each Syncfusion package (and its CSS) is
// downloaded only when the user opens that page.
const DataGridPage = lazy(() => import('./pages/DataGridPage'));
const PivotPage = lazy(() => import('./pages/PivotPage'));
const ChartPage = lazy(() => import('./pages/ChartPage'));
const MapsPage = lazy(() => import('./pages/MapsPage'));
const TreeMapPage = lazy(() => import('./pages/TreeMapPage'));
const HeatMapPage = lazy(() => import('./pages/HeatMapPage'));
const SankeyPage = lazy(() => import('./pages/SankeyPage'));
const GanttPage = lazy(() => import('./pages/GanttPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const DiagramPage = lazy(() => import('./pages/DiagramPage'));

function NotFound() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>That page doesn’t exist.</p>
      <Link to="/dashboard" className="btn-primary">Back to dashboard</Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/grid" element={<DataGridPage />} />
          <Route path="/pivot" element={<PivotPage />} />
          <Route path="/chart" element={<ChartPage />} />
          <Route path="/maps" element={<MapsPage />} />
          <Route path="/treemap" element={<TreeMapPage />} />
          <Route path="/heatmap" element={<HeatMapPage />} />
          <Route path="/sankey" element={<SankeyPage />} />
          <Route path="/gantt" element={<GanttPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/diagram" element={<DiagramPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
