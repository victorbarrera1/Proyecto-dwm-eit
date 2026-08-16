import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, LockKeyhole, Sprout } from 'lucide-react';
import { AppShell } from './components/AppShell';
import { LoadingState } from './components/PageStates';
import { useAuth } from './context/AuthContext';

const LoginPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.RegisterPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const CropsPage = lazy(() => import('./pages/CropsPages').then((module) => ({ default: module.CropsPage })));
const CropFormPage = lazy(() => import('./pages/CropsPages').then((module) => ({ default: module.CropFormPage })));
const SensorsPage = lazy(() => import('./pages/SensorsPages').then((module) => ({ default: module.SensorsPage })));
const SensorDetailPage = lazy(() => import('./pages/SensorsPages').then((module) => ({ default: module.SensorDetailPage })));
const SensorFormPage = lazy(() => import('./pages/SensorsPages').then((module) => ({ default: module.SensorFormPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((module) => ({ default: module.HistoryPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then((module) => ({ default: module.AccountPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminUsersPage })));
const AdminUserDetailPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminUserDetailPage })));

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
    <Suspense fallback={<div className="full-page-state"><LoadingState label="Preparando la vista…" /></div>}>
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
    </Suspense>
  );
}
