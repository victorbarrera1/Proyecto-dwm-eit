import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, LockKeyhole, Sprout } from 'lucide-react';
import { AppShell } from './components/AppShell';
import { LoadingState } from './components/PageStates';
import { useAuth } from './context/AuthContext';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { CropFormPage, CropsPage } from './pages/CropsPages';
import { SensorDetailPage, SensorFormPage, SensorsPage } from './pages/SensorsPages';
import { HistoryPage } from './pages/HistoryPage';
import { AccountPage } from './pages/AccountPage';
import { AdminDashboardPage, AdminUserDetailPage, AdminUsersPage } from './pages/AdminPages';

function ProtectedRoute() {
  const { session, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="full-page-state"><LoadingState label="Abriendo tu invernadero…" /></div>;
  if (!session) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <Outlet />;
}

function AdminRoute() {
  const { session } = useAuth();
  if (session?.user.role !== 'ADMIN') return <ForbiddenPage />;
  return <Outlet />;
}

function PublicOnlyRoute() {
  const { session, isLoading } = useAuth();
  if (isLoading) return <div className="full-page-state"><LoadingState label="Comprobando tu sesión…" /></div>;
  if (session) return <Navigate to="/app" replace />;
  return <Outlet />;
}

function ForbiddenPage() {
  return (
    <div className="standalone-state">
      <span className="standalone-state__icon"><LockKeyhole /></span>
      <span className="eyebrow">Acceso restringido</span>
      <h1>Esta sección es solo para administradores</h1>
      <p>Tu cuenta no tiene permisos para consultar estadísticas ni recursos de otros usuarios.</p>
      <a className="button button--primary" href="/app"><Home size={17} /> Volver al inicio</a>
    </div>
  );
}

function NotFoundPage() {
  return (
    <main className="standalone-state standalone-state--not-found">
      <span className="standalone-state__icon"><Sprout /></span>
      <span className="eyebrow">Error 404</span>
      <h1>Esta parcela no existe</h1>
      <p>La dirección puede haber cambiado o el recurso ya no está disponible.</p>
      <button className="button button--secondary" type="button" onClick={() => window.history.back()}><ArrowLeft size={17} /> Volver</button>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/app" element={<DashboardPage />} />
          <Route path="/app/crops" element={<CropsPage />} />
          <Route path="/app/crops/new" element={<CropFormPage />} />
          <Route path="/app/crops/:cropId/edit" element={<CropFormPage />} />
          <Route path="/app/sensors" element={<SensorsPage />} />
          <Route path="/app/sensors/new" element={<SensorFormPage />} />
          <Route path="/app/sensors/:sensorId" element={<SensorDetailPage />} />
          <Route path="/app/sensors/:sensorId/edit" element={<SensorFormPage />} />
          <Route path="/app/history" element={<HistoryPage />} />
          <Route path="/app/account" element={<AccountPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
