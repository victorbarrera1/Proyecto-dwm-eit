import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowLeft, ArrowRight, FilterX, Gauge, Pencil, Plus, RadioTower, Search, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { subDays } from 'date-fns';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState, ErrorState, LoadingState } from '../components/PageStates';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { useToast } from '../context/ToastContext';
import { api, ApiError, getErrorMessage } from '../lib/api';
import { formatDate, formatNumber, sensorTypeLabels } from '../lib/format';
import type { Sensor, SensorInput, SensorType } from '../types';

const sensorTypes = Object.entries(sensorTypeLabels) as Array<[SensorType, string]>;
const sensorUnits: Record<SensorType, string> = {
  TEMPERATURE: '°C',
  AIR_HUMIDITY: '%',
  SOIL_MOISTURE: '%',
  LIGHT: 'lx'
};

const sensorSchema = z.object({
  code: z.string().trim().min(3, 'Ingresa al menos 3 caracteres.').max(40, 'Usa un máximo de 40 caracteres.').regex(/^[A-Za-z0-9_-]+$/, 'Usa letras, números, guiones o guion bajo.'),
  name: z.string().trim().min(2, 'Ingresa al menos 2 caracteres.').max(80, 'Usa un nombre más breve.'),
  type: z.enum(['TEMPERATURE', 'AIR_HUMIDITY', 'SOIL_MOISTURE', 'LIGHT']),
  active: z.boolean()
});

type SensorFormValues = z.infer<typeof sensorSchema>;

function sensorTone(type: SensorType) {
  if (type === 'TEMPERATURE') return 'soil';
  if (type === 'AIR_HUMIDITY' || type === 'SOIL_MOISTURE') return 'water';
  return 'leaf';
}

export function SensorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [deleteTarget, setDeleteTarget] = useState<Sensor | null>(null);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const page = Number(searchParams.get('page') || 1);
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || '';
  const active = searchParams.get('active') || '';

  useEffect(() => setQuery(q), [q]);

  const sensorsQuery = useQuery({
    queryKey: ['sensors', q, type, active, page],
    queryFn: ({ signal }) => api.sensors.list({ q, type, active: active === '' ? undefined : active === 'true', page, limit: 12 }, signal),
    placeholderData: (previous) => previous
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.sensors.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteTarget(null);
      showToast('Sensor eliminado junto con sus registros asociados.', 'success');
    },
    onError: (error) => showToast(getErrorMessage(error), 'error')
  });

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };
  const reset = () => { setQuery(''); setSearchParams({}); };
  const hasFilters = Boolean(q || type || active);
  const sensors = sensorsQuery.data?.items || [];
  const meta = sensorsQuery.data?.meta;

  return (
    <div className="page">
      <header className="page-header">
        <div><span className="eyebrow">Panel de instrumentos</span><h1>Sensores</h1><p>Administra los instrumentos que registran el ambiente de tu invernadero.</p></div>
        <Link className="button button--primary" to="/app/sensors/new"><Plus size={18} /> Nuevo sensor</Link>
      </header>

      <form className="filter-panel filter-panel--sensors" role="search" onSubmit={(event) => { event.preventDefault(); setFilter('q', query.trim()); }}>
        <div className="search-field"><Search size={18} /><label className="sr-only" htmlFor="sensor-search">Buscar sensores</label><input id="sensor-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o código" /><button className="button button--secondary button--small" type="submit">Buscar</button></div>
        <label className="filter-field"><span>Tipo</span><select value={type} onChange={(event) => setFilter('type', event.target.value)}><option value="">Todos</option>{sensorTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="filter-field"><span>Estado</span><select value={active} onChange={(event) => setFilter('active', event.target.value)}><option value="">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></select></label>
        {hasFilters && <button className="button button--ghost button--small filter-reset" type="button" onClick={reset}><FilterX size={17} /> Limpiar</button>}
      </form>

      {sensorsQuery.isPending ? <LoadingState label="Consultando sensores…" /> : sensorsQuery.isError ? <ErrorState message={getErrorMessage(sensorsQuery.error)} onRetry={() => sensorsQuery.refetch()} /> : !sensors.length ? (
        <EmptyState title={hasFilters ? 'No hay sensores que coincidan' : 'Aún no has registrado sensores'} description={hasFilters ? 'Modifica los filtros o limpia la búsqueda.' : 'Agrega un sensor para comenzar a registrar datos históricos.'} action={hasFilters ? <button className="button button--secondary" onClick={reset}>Limpiar filtros</button> : <Link className="button button--primary" to="/app/sensors/new"><Plus size={18} /> Agregar sensor</Link>} />
      ) : (
        <section className="panel data-panel" aria-labelledby="sensor-results-title">
          <div className="data-panel__heading"><div><span className="eyebrow">Instrumentos</span><h2 id="sensor-results-title">{meta?.total ?? sensors.length} sensores</h2></div>{sensorsQuery.isFetching && <span className="subtle-status">Actualizando…</span>}</div>
          <div className="table-wrap">
            <table className="data-table responsive-table">
              <thead><tr><th>Sensor</th><th>Tipo</th><th>Unidad</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>{sensors.map((sensor) => (
                <tr key={sensor.id}>
                  <td data-label="Sensor"><Link className="entity-cell entity-cell--link" to={`/app/sensors/${sensor.id}`}><span className={`entity-icon entity-icon--${sensorTone(sensor.type)}`}><RadioTower size={18} /></span><span><strong>{sensor.name}</strong><small className="mono">{sensor.code}</small></span></Link></td>
                  <td data-label="Tipo">{sensorTypeLabels[sensor.type]}</td>
                  <td data-label="Unidad"><span className="mono">{sensor.unit}</span></td>
                  <td data-label="Estado"><span className={`status status--${sensor.active ? 'success' : 'neutral'}`}>{sensor.active ? 'Activo' : 'Inactivo'}</span></td>
                  <td className="table-actions"><Link className="icon-button" to={`/app/sensors/${sensor.id}/edit`} aria-label={`Editar ${sensor.name}`}><Pencil size={17} /></Link><button className="icon-button icon-button--danger" type="button" onClick={() => setDeleteTarget(sensor)} aria-label={`Eliminar ${sensor.name}`}><Trash2 size={17} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {meta && <Pagination page={meta.page} limit={meta.limit} total={meta.total} onPageChange={(next) => setFilter('page', String(next))} />}
        </section>
      )}

      <Modal open={Boolean(deleteTarget)} title="Eliminar sensor" description={`También se eliminará el historial asociado a “${deleteTarget?.name}”.`} onClose={() => !deleteMutation.isPending && setDeleteTarget(null)} footer={<><button className="button button--ghost" type="button" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>Cancelar</button><button className="button button--danger" type="button" disabled={deleteMutation.isPending || !navigator.onLine} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}><Trash2 size={17} /> {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar sensor'}</button></>}>
        <p>Los registros históricos de este sensor no podrán recuperarse.</p>
      </Modal>
    </div>
  );
}

export function SensorFormPage() {
  const { sensorId } = useParams();
  const editing = Boolean(sensorId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const sensorQuery = useQuery({ queryKey: ['sensor', sensorId], queryFn: ({ signal }) => api.sensors.get(sensorId!, signal), enabled: editing });
  const { register, handleSubmit, reset, setError, watch, formState: { errors, isDirty } } = useForm<SensorFormValues>({
    resolver: zodResolver(sensorSchema),
    defaultValues: { code: '', name: '', type: 'TEMPERATURE', active: true }
  });

  useEffect(() => {
    if (sensorQuery.data) reset({ code: sensorQuery.data.code, name: sensorQuery.data.name, type: sensorQuery.data.type, active: sensorQuery.data.active });
  }, [sensorQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: SensorInput) => editing
      ? api.sensors.update(sensorId!, { code: values.code, name: values.name, active: values.active })
      : api.sensors.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showToast(editing ? 'Cambios guardados.' : 'Sensor creado.', 'success');
      navigate('/app/sensors');
    }
  });

  const submit = async (values: SensorFormValues) => {
    try { await saveMutation.mutateAsync(values); }
    catch (error) {
      if (error instanceof ApiError && error.fields) Object.entries(error.fields).forEach(([field, message]) => field in values && setError(field as keyof SensorFormValues, { message: Array.isArray(message) ? message[0] : message }));
      else showToast(getErrorMessage(error), 'error');
    }
  };

  if (editing && sensorQuery.isPending) return <LoadingState label="Cargando sensor…" />;
  if (sensorQuery.isError) return <ErrorState message={getErrorMessage(sensorQuery.error)} onRetry={() => sensorQuery.refetch()} />;

  return (
    <div className="page form-page">
      <Link className="back-link" to="/app/sensors"><ArrowLeft size={17} /> Volver a sensores</Link>
      <header className="page-header form-page__header"><div><span className="eyebrow">Panel de instrumentos</span><h1>{editing ? 'Editar sensor' : 'Nuevo sensor'}</h1><p>El sensor quedará asociado exclusivamente a tu invernadero.</p></div></header>
      <form className="form-layout" onSubmit={handleSubmit(submit)} noValidate>
        <section className="panel form-card">
          <div className="form-section-heading"><span className="form-section-heading__number">01</span><div><h2>Identificación</h2><p>Nombre visible y código técnico único.</p></div></div>
          <div className="form-grid form-grid--two">
            <div className="field"><label htmlFor="sensor-name">Nombre</label><input id="sensor-name" placeholder="Ej. Temperatura central" aria-invalid={Boolean(errors.name)} {...register('name')} />{errors.name && <span className="field-error">{errors.name.message}</span>}</div>
            <div className="field"><label htmlFor="sensor-code">Código</label><input className="mono" id="sensor-code" placeholder="TEMP-CENTRAL-01" aria-invalid={Boolean(errors.code)} {...register('code')} />{errors.code && <span className="field-error">{errors.code.message}</span>}</div>
          </div>
        </section>
        <section className="panel form-card">
          <div className="form-section-heading"><span className="form-section-heading__number">02</span><div><h2>Medición</h2><p>Tipo de dato y unidad reportada.</p></div></div>
          <div className="form-grid form-grid--two">
            <div className="field"><label htmlFor="sensor-type">Tipo</label><select id="sensor-type" disabled={editing} {...register('type')}>{sensorTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{editing && <small className="field-help">El tipo se fija al crear el sensor.</small>}</div>
            <div className="field"><label>Unidad asignada</label><output className="derived-value mono" aria-live="polite">{sensorUnits[watch('type')]}</output><small className="field-help">La API asigna esta unidad según el tipo seleccionado.</small></div>
          </div>
          <label className="switch-field"><input type="checkbox" {...register('active')} /><span className="switch-control" /><span><strong>Sensor activo</strong><small>Los sensores inactivos conservan su historial.</small></span></label>
        </section>
        <div className="form-actions"><Link className="button button--ghost" to="/app/sensors">Cancelar</Link><button className="button button--primary" type="submit" disabled={saveMutation.isPending || !navigator.onLine || (editing && !isDirty)}>{saveMutation.isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear sensor'}</button></div>
      </form>
    </div>
  );
}

export function SensorDetailPage() {
  const { sensorId = '' } = useParams();
  const range = useMemo(() => ({ from: subDays(new Date(), 7).toISOString(), to: new Date().toISOString() }), []);
  const sensorQuery = useQuery({ queryKey: ['sensor', sensorId], queryFn: ({ signal }) => api.sensors.get(sensorId, signal) });
  const readingsQuery = useQuery({ queryKey: ['readings', sensorId, range.from, range.to], queryFn: ({ signal }) => api.sensors.readings(sensorId, { ...range, page: 1, limit: 250 }, signal) });
  if (sensorQuery.isPending) return <LoadingState label="Cargando sensor…" />;
  if (sensorQuery.isError) return <ErrorState message={getErrorMessage(sensorQuery.error)} onRetry={() => sensorQuery.refetch()} />;
  const sensor = sensorQuery.data;
  const readings = readingsQuery.data?.items || [];
  const last = readings[readings.length - 1];
  return (
    <div className="page">
      <Link className="back-link" to="/app/sensors"><ArrowLeft size={17} /> Volver a sensores</Link>
      <header className="page-header sensor-detail-header">
        <div><span className="eyebrow">{sensorTypeLabels[sensor.type]}</span><h1>{sensor.name}</h1><p className="mono">{sensor.code}</p></div>
        <div className="page-header__actions"><Link className="button button--secondary" to={`/app/sensors/${sensor.id}/edit`}><Pencil size={17} /> Editar</Link><Link className="button button--primary" to={`/app/history?sensor=${sensor.id}`}><Activity size={17} /> Ver historial</Link></div>
      </header>
      <section className="sensor-instrument" aria-label="Resumen del sensor">
        <div className={`sensor-instrument__dial sensor-instrument__dial--${sensorTone(sensor.type)}`}><Gauge aria-hidden="true" /><span>Último valor</span><strong>{last ? formatNumber(last.value) : '—'} <small>{sensor.unit}</small></strong></div>
        <dl><div><dt>Estado</dt><dd><span className={`status status--${sensor.active ? 'success' : 'neutral'}`}>{sensor.active ? 'Activo' : 'Inactivo'}</span></dd></div><div><dt>Tipo</dt><dd>{sensorTypeLabels[sensor.type]}</dd></div><div><dt>Último registro</dt><dd>{last ? formatDate(last.recordedAt, true) : 'Sin registros'}</dd></div><div><dt>Creado</dt><dd>{formatDate(sensor.createdAt)}</dd></div></dl>
      </section>
      <section className="panel chart-panel sensor-detail-chart" aria-labelledby="sensor-chart-title">
        <div className="panel__header"><div><span className="eyebrow">Últimos 7 días</span><h2 id="sensor-chart-title">Comportamiento reciente</h2></div><Link className="text-link" to={`/app/history?sensor=${sensor.id}`}>Ampliar período <ArrowRight size={16} /></Link></div>
        {readingsQuery.isPending ? <LoadingState label="Cargando registros…" /> : readingsQuery.isError ? <ErrorState message={getErrorMessage(readingsQuery.error)} onRetry={() => readingsQuery.refetch()} /> : !readings.length ? <EmptyState title="Sin registros recientes" description="El historial aparecerá cuando este sensor envíe su primera lectura." /> : (
          <div className="chart-wrap chart-wrap--detail" role="img" aria-label={`Gráfico de ${sensor.name} de los últimos siete días`}><ResponsiveContainer width="100%" height="100%"><LineChart data={readings}><CartesianGrid stroke="#dbe4df" vertical={false} /><XAxis dataKey="recordedAt" tickFormatter={(value: string) => formatDate(value)} tick={{ fill: '#607068', fontSize: 11 }} minTickGap={40} /><YAxis domain={['auto', 'auto']} tick={{ fill: '#607068', fontSize: 11 }} /><Tooltip labelFormatter={(value) => formatDate(String(value), true)} formatter={(value) => [`${formatNumber(Number(value))} ${sensor.unit}`, sensor.name]} /><Line dataKey="value" type="monotone" stroke="#2b7898" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div>
        )}
      </section>
    </div>
  );
}
