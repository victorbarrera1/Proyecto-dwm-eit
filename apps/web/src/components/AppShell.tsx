import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpenText,
  CloudSun,
  Download,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Sprout,
  ThermometerSun,
  UserRound,
  UsersRound,
  X
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { OfflineBanner } from './PageStates';
import { Modal } from './Modal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const primaryNav = [
  { to: '/app', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/app/crops', label: 'Cultivos', icon: Sprout },
  { to: '/app/sensors', label: 'Sensores', icon: ThermometerSun },
  { to: '/app/history', label: 'Historial', icon: History }
];

const pageTitles: Array<[RegExp, string]> = [
  [/^\/admin\/users\/.+/, 'Detalle de usuario'],
  [/^\/admin\/users/, 'Usuarios'],
  [/^\/admin/, 'Resumen administrativo'],
  [/^\/app\/crops\/new/, 'Nuevo cultivo'],
  [/^\/app\/crops\/.+\/edit/, 'Editar cultivo'],
  [/^\/app\/crops/, 'Cultivos'],
  [/^\/app\/sensors\/new/, 'Nuevo sensor'],
  [/^\/app\/sensors\/.+\/edit/, 'Editar sensor'],
  [/^\/app\/sensors\/.+/, 'Detalle del sensor'],
  [/^\/app\/sensors/, 'Sensores'],
  [/^\/app\/history/, 'Historial'],
  [/^\/app\/account/, 'Cuenta e invernadero'],
  [/^\/app$/, 'Inicio']
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-mark" aria-label="Savia">
      <span className="brand-mark__icon"><Sprout size={22} /></span>
      {!compact && (
        <span>
          <strong>Savia</strong>
          <small>Cabina de cultivo</small>
        </span>
      )}
    </div>
  );
}

export function AppShell() {
  const { session, logout, isAuthenticating } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisterError: () => showToast('No pudimos activar el modo instalable.', 'error')
  });

  const title = useMemo(
    () => pageTitles.find(([pattern]) => pattern.test(location.pathname))?.[1] || 'Savia',
    [location.pathname]
  );

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('beforeinstallprompt', captureInstall);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('beforeinstallprompt', captureInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') showToast('Savia se instaló correctamente.', 'success');
    setInstallPrompt(null);
  };

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`} aria-label="Navegación principal">
        <div className="sidebar__top">
          <BrandMark />
          <button className="icon-button sidebar__close" type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
            <X />
          </button>
        </div>
        <nav className="sidebar__nav">
          <p className="nav-eyebrow">Mi invernadero</p>
          {primaryNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
              <Icon size={19} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
          {session?.user.role === 'ADMIN' && (
            <>
              <p className="nav-eyebrow nav-eyebrow--spaced">Administración</p>
              <NavLink to="/admin" end className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
                <BarChart3 size={19} /> Resumen global
              </NavLink>
              <NavLink to="/admin/users" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
                <UsersRound size={19} /> Usuarios
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar__footer">
          {installPrompt && (
            <button className="nav-link nav-link--button" type="button" onClick={handleInstall}>
              <Download size={19} /> Instalar aplicación
            </button>
          )}
          <NavLink to="/app/account" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
            <UserRound size={19} /> Cuenta e invernadero
          </NavLink>
          <button className="nav-link nav-link--button" type="button" onClick={handleLogout} disabled={isAuthenticating}>
            <LogOut size={19} /> Cerrar sesión
          </button>
          <div className="session-card">
            <span className="avatar" aria-hidden="true">{session?.user.name?.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{session?.user.name}</strong>
              <small>{session?.user.email}</small>
            </span>
          </div>
        </div>
      </aside>

      {menuOpen && <button className="sidebar-scrim" type="button" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}

      <div className="app-frame">
        {!online && <OfflineBanner />}
        <header className="topbar">
          <button className="icon-button menu-trigger" type="button" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
            <Menu />
          </button>
          <div className="topbar__title">
            <span>{session?.greenhouse?.name || 'Mi invernadero'}</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar__actions">
            <span className={`connection-state ${online ? '' : 'connection-state--offline'}`}>
              <CloudSun size={16} aria-hidden="true" /> {online ? 'Conectado' : 'Sin conexión'}
            </span>
            {installPrompt && (
              <button className="button button--secondary button--small install-button" type="button" onClick={handleInstall}>
                <Download size={16} /> Instalar
              </button>
            )}
          </div>
        </header>
        <main id="main-content" className="app-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Navegación móvil">
        {primaryNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
        <NavLink to="/app/account" className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}>
          <MoreHorizontal size={20} aria-hidden="true" />
          <span>Más</span>
        </NavLink>
      </nav>

      <Modal
        open={needRefresh}
        title="Hay una nueva versión"
        description="Actualiza ahora para usar la última versión de Savia."
        onClose={() => setNeedRefresh(false)}
        footer={
          <>
            <button className="button button--ghost" type="button" onClick={() => setNeedRefresh(false)}>Más tarde</button>
            <button className="button button--primary" type="button" onClick={() => updateServiceWorker(true)}>
              <BookOpenText size={17} /> Actualizar
            </button>
          </>
        }
      >
        <p>La actualización conserva tu sesión y reemplaza los archivos de la aplicación.</p>
      </Modal>
    </div>
  );
}
