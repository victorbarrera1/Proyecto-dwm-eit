import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowLeft, ArrowRight, Building2, Database, Leaf, Search, ShieldCheck, Sprout, ThermometerSun, Trash2, UserRound, UsersRound } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../components/PageStates';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { useToast } from '../context/ToastContext';
import { api, getErrorMessage } from '../lib/api';
import { cropStatusLabels, formatDate, formatNumber, sensorTypeLabels } from '../lib/format';
import type { Crop, Sensor, SensorReading, User } from '../types';

export function AdminDashboardPage() {
  const statsQuery = useQuery({ queryKey: ['admin', 'stats'], queryFn: ({ signal }) => api.admin.stats(signal) });
  const usersQuery = useQuery({ queryKey: ['admin', 'users', 'recent'], queryFn: ({ signal }) => api.admin.users({ page: 1, limit: 5 }, signal) });
  if (statsQuery.isPending) return <LoadingState label="Calculando estadísticas globales…" />;
  if (statsQuery.isError) return <ErrorState message={getErrorMessage(statsQuery.error)} onRetry={() => statsQuery.refetch()} />;
  const stats = statsQuery.data;
  return (
    <div className="page admin-page">
      <header className="page-header"><div><span className="eyebrow">Acceso administrativo</span><h1>Resumen global</h1><p>Una vista agregada de la actividad almacenada en el sistema.</p></div><span className="admin-role-badge"><ShieldCheck size={17} /> Administrador</span></header>
      <section className="admin-stats" aria-label="Estadísticas globales">
        <article><span className="admin-stat-icon"><UsersRound /></span><div><strong>{formatNumber(stats.usersTotal, 0)}</strong><span>Usuarios</span></div></article>
        <article><span className="admin-stat-icon"><Building2 /></span><div><strong>{formatNumber(stats.greenhousesTotal, 0)}</strong><span>Invernaderos</span></div></article>
        <article><span className="admin-stat-icon"><Sprout /></span><div><strong>{formatNumber(stats.cropsTotal, 0)}</strong><span>Cultivos</span></div></article>
        <article><span className="admin-stat-icon"><ThermometerSun /></span><div><strong>{formatNumber(stats.sensorsTotal, 0)}</strong><span>Sensores</span></div></article>
        <article><span className="admin-stat-icon"><Activity /></span><div><strong>{formatNumber(stats.readingsTotal, 0)}</strong><span>Registros</span></div></article>
      </section>
      <div className="admin-overview-grid">
        <section className="panel admin-system-panel" aria-labelledby="system-title">
          <div className="panel__header"><div><span className="eyebrow">Persistencia</span><h2 id="system-title">Huella del sistema</h2></div><Database /></div>
          <div className="system-ratio"><span>Recursos por usuario</span><strong>{stats.usersTotal ? formatNumber((stats.cropsTotal + stats.sensorsTotal) / stats.usersTotal) : '0'}</strong><small>Promedio de cultivos y sensores</small></div>
          <dl><div><dt>Sensores por invernadero</dt><dd>{stats.greenhousesTotal ? formatNumber(stats.sensorsTotal / stats.greenhousesTotal) : '0'}</dd></div><div><dt>Registros por sensor</dt><dd>{stats.sensorsTotal ? formatNumber(stats.readingsTotal / stats.sensorsTotal, 0) : '0'}</dd></div></dl>
        </section>
        <section className="panel recent-users" aria-labelledby="recent-users-title">
          <div className="panel__header"><div><span className="eyebrow">Cuentas</span><h2 id="recent-users-title">Usuarios recientes</h2></div><Link className="text-link" to="/admin/users">Ver todos <ArrowRight size={16} /></Link></div>
          {usersQuery.isPending ? <LoadingState label="Cargando usuarios…" /> : usersQuery.isError ? <ErrorState message={getErrorMessage(usersQuery.error)} onRetry={() => usersQuery.refetch()} /> : usersQuery.data.items.length ? <ul className="user-list">{usersQuery.data.items.map((user) => <li key={user.id}><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><span className={`status status--${user.role === 'ADMIN' ? 'soil' : 'neutral'}`}>{user.role === 'ADMIN' ? 'Admin' : 'Usuario'}</span><Link className="icon-button" to={`/admin/users/${user.id}`} aria-label={`Ver ${user.name}`}><ArrowRight /></Link></li>)}</ul> : <EmptyState title="Sin usuarios" description="Las cuentas registradas aparecerán aquí." />}
        </section>
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  const usersQuery = useQuery({ queryKey: ['admin', 'users', q, page], queryFn: ({ signal }) => api.admin.users({ q, page, limit: 15 }, signal), placeholderData: (previous) => previous });
  const setParam = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); if (key !== 'page') next.delete('page'); setParams(next); };
  const users = usersQuery.data?.items || [];
  const meta = usersQuery.data?.meta;
  return (
    <div className="page admin-page">
      <header className="page-header"><div><span className="eyebrow">Administración</span><h1>Usuarios</h1><p>Consulta cada cuenta y los recursos asociados a su invernadero.</p></div></header>
      <form className="filter-panel filter-panel--admin" role="search" onSubmit={(event) => { event.preventDefault(); setParam('q', search.trim()); }}><div className="search-field"><Search size={18} /><label className="sr-only" htmlFor="user-search">Buscar usuarios</label><input id="user-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o correo" /><button className="button button--secondary button--small" type="submit">Buscar</button></div>{q && <button className="button button--ghost button--small" type="button" onClick={() => { setSearch(''); setParams({}); }}>Limpiar</button>}</form>
      {usersQuery.isPending ? <LoadingState label="Consultando usuarios…" /> : usersQuery.isError ? <ErrorState message={getErrorMessage(usersQuery.error)} onRetry={() => usersQuery.refetch()} /> : !users.length ? <EmptyState title={q ? 'No hay usuarios que coincidan' : 'No hay usuarios registrados'} description={q ? 'Prueba con otro nombre o correo.' : 'Las nuevas cuentas aparecerán en esta lista.'} /> : (
        <section className="panel data-panel" aria-labelledby="users-title"><div className="data-panel__heading"><div><span className="eyebrow">Directorio</span><h2 id="users-title">{meta?.total || users.length} usuarios</h2></div>{usersQuery.isFetching && <span className="subtle-status">Actualizando…</span>}</div><div className="table-wrap"><table className="data-table responsive-table"><thead><tr><th>Usuario</th><th>Rol</th><th>Registro</th><th><span className="sr-only">Acción</span></th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td data-label="Usuario"><div className="entity-cell"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td><td data-label="Rol"><span className={`status status--${user.role === 'ADMIN' ? 'soil' : 'neutral'}`}>{user.role === 'ADMIN' ? 'Administrador' : 'Usuario'}</span></td><td data-label="Registro">{formatDate(user.createdAt)}</td><td className="table-actions"><Link className="button button--secondary button--small" to={`/admin/users/${user.id}`}>Ver recursos <ArrowRight size={16} /></Link></td></tr>)}</tbody></table></div>{meta && <Pagination page={meta.page} limit={meta.limit} total={meta.total} onPageChange={(next) => setParam('page', String(next))} />}</section>
      )}
    </div>
  );
}

type ResourceType = 'crops' | 'sensors' | 'readings';

function ResourceTable({ type, items }: { type: ResourceType; items: Array<Crop | Sensor | SensorReading> }) {
  if (type === 'crops') return <table className="data-table responsive-table"><thead><tr><th>Cultivo</th><th>Especie</th><th>Estado</th><th>Creación</th></tr></thead><tbody>{(items as Crop[]).map((crop) => <tr key={crop.id}><td data-label="Cultivo"><strong>{crop.name}</strong></td><td data-label="Especie">{crop.species}</td><td data-label="Estado"><span className="status status--neutral">{cropStatusLabels[crop.status]}</span></td><td data-label="Creación">{formatDate(crop.createdAt)}</td></tr>)}</tbody></table>;
  if (type === 'sensors') return <table className="data-table responsive-table"><thead><tr><th>Sensor</th><th>Tipo</th><th>Unidad</th><th>Estado</th></tr></thead><tbody>{(items as Sensor[]).map((sensor) => <tr key={sensor.id}><td data-label="Sensor"><strong>{sensor.name}</strong><small className="mono table-subline">{sensor.code}</small></td><td data-label="Tipo">{sensorTypeLabels[sensor.type]}</td><td data-label="Unidad" className="mono">{sensor.unit}</td><td data-label="Estado"><span className={`status status--${sensor.active ? 'success' : 'neutral'}`}>{sensor.active ? 'Activo' : 'Inactivo'}</span></td></tr>)}</tbody></table>;
  return <table className="data-table responsive-table"><thead><tr><th>Sensor ID</th><th>Valor</th><th>Fecha</th></tr></thead><tbody>{(items as SensorReading[]).map((reading) => <tr key={reading.id}><td data-label="Sensor ID" className="mono">{reading.sensorId}</td><td data-label="Valor"><strong className="mono">{formatNumber(reading.value)}</strong></td><td data-label="Fecha">{formatDate(reading.recordedAt, true)}</td></tr>)}</tbody></table>;
}

export function AdminUserDetailPage() {
  const { userId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const type = (params.get('type') || 'crops') as ResourceType;
  const page = Number(params.get('page') || 1);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const userQuery = useQuery({ queryKey: ['admin', 'user', userId], queryFn: ({ signal }) => api.admin.user(userId, signal) });
  const resourcesQuery = useQuery({ queryKey: ['admin', 'user-resources', userId, type, page], queryFn: ({ signal }) => api.admin.resources<Crop | Sensor | SensorReading>(userId, { type, page, limit: 15 }, signal) });
  const deleteMutation = useMutation({ mutationFn: () => api.admin.removeUser(userId), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin'] }); showToast('Cuenta y registros asociados eliminados.', 'success'); navigate('/admin/users', { replace: true }); }, onError: (error) => showToast(getErrorMessage(error), 'error') });
  const setType = (nextType: ResourceType) => { setParams({ type: nextType }); };
  if (userQuery.isPending) return <LoadingState label="Cargando cuenta y recursos…" />;
  if (userQuery.isError) return <ErrorState message={getErrorMessage(userQuery.error)} onRetry={() => userQuery.refetch()} />;
  const user = userQuery.data;
  const items = resourcesQuery.data?.items || [];
  const meta = resourcesQuery.data?.meta;
  const tabLabels: Record<ResourceType, string> = { crops: `Cultivos${user.counts ? ` (${user.counts.crops})` : ''}`, sensors: `Sensores${user.counts ? ` (${user.counts.sensors})` : ''}`, readings: `Registros${user.counts ? ` (${user.counts.readings})` : ''}` };
  return (
    <div className="page admin-page">
      <Link className="back-link" to="/admin/users"><ArrowLeft size={17} /> Volver a usuarios</Link>
      <header className="admin-user-hero"><div className="admin-user-hero__identity"><span className="avatar avatar--large">{user.name.slice(0, 1).toUpperCase()}</span><div><span className="eyebrow eyebrow--light">Cuenta registrada</span><h1>{user.name}</h1><p>{user.email}</p></div></div><dl><div><dt>Rol</dt><dd>{user.role === 'ADMIN' ? 'Administrador' : 'Usuario'}</dd></div><div><dt>Invernadero</dt><dd>{user.greenhouse?.name || 'Sin información'}</dd></div><div><dt>Registro</dt><dd>{formatDate(user.createdAt)}</dd></div></dl></header>
      <section className="panel resource-panel" aria-labelledby="resources-title">
        <div className="resource-panel__header"><div><span className="eyebrow">Solo lectura</span><h2 id="resources-title">Recursos asociados</h2></div><button className="button button--danger button--small" type="button" onClick={() => setDeleteOpen(true)} disabled={user.role === 'ADMIN'}><Trash2 size={16} /> Eliminar cuenta</button></div>
        <div className="resource-tabs" role="tablist" aria-label="Tipo de recurso">{(['crops', 'sensors', 'readings'] as ResourceType[]).map((resourceType) => <button key={resourceType} type="button" role="tab" aria-selected={type === resourceType} className={type === resourceType ? 'is-active' : ''} onClick={() => setType(resourceType)}>{tabLabels[resourceType]}</button>)}</div>
        {resourcesQuery.isPending ? <LoadingState label="Consultando recursos…" /> : resourcesQuery.isError ? <ErrorState message={getErrorMessage(resourcesQuery.error)} onRetry={() => resourcesQuery.refetch()} /> : !items.length ? <EmptyState title="Sin recursos de este tipo" description="No existen registros asociados para mostrar." /> : <><div className="table-wrap"><ResourceTable type={type} items={items} /></div>{meta && <Pagination page={meta.page} limit={meta.limit} total={meta.total} onPageChange={(next) => setParams({ type, page: String(next) })} />}</>}
      </section>
      <Modal open={deleteOpen} title="Eliminar cuenta y sus registros" description="Esta operación es permanente y elimina el invernadero, cultivos, sensores y lecturas asociadas." onClose={() => !deleteMutation.isPending && setDeleteOpen(false)} footer={<><button className="button button--ghost" type="button" onClick={() => setDeleteOpen(false)} disabled={deleteMutation.isPending}>Cancelar</button><button className="button button--danger" type="button" disabled={confirmation !== user.email || deleteMutation.isPending || !navigator.onLine} onClick={() => deleteMutation.mutate()}><Trash2 size={17} /> {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar definitivamente'}</button></>}>
        <div className="field"><label htmlFor="delete-confirmation">Escribe <strong>{user.email}</strong> para confirmar</label><input id="delete-confirmation" type="email" autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
      </Modal>
    </div>
  );
}
