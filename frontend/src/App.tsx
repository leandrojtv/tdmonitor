import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/Dashboard';
import { ConnectionsPage } from './pages/Connections';
import { PanelsPage } from './pages/Panels';
import { SchedulesPage } from './pages/Schedules';
import { LogsPage } from './pages/Logs';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/panels" element={<PanelsPage />} />
        <Route path="/schedules" element={<SchedulesPage />} />
        <Route path="/logs" element={<LogsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
