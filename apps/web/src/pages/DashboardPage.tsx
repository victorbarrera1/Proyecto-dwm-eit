import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowRight, CalendarDays, Gauge, Leaf, RadioTower, Sprout, ThermometerSun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { subDays } from 'date-fns';
import { api, getErrorMessage } from '../lib/api';
import { cropStatusLabels, formatDate, formatNumber, sensorTypeLabels } from '../lib/format';
import { EmptyState, ErrorState, LoadingState } from '../components/PageStates';

const periods = [
  { label: '24 h', days: 1 },
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 }
];

export function DashboardPage() {
  const [periodDays, setPeriodDays] = useState(7);
  const [sensorId, setSensorId] = useState('');
  const range = useMemo(() => ({ from: subDays(new Date(), periodDays).toISOString(), to: new Date().toISOString() }), [periodDays]);

  const summaryQuery = useQuery({
    queryKey: ['dashboard', range.from.slice(0, 10), range.to.slice(0, 10)],
    queryFn: ({ signal }) => api.dashboard.summary(range.from, range.to, signal)
  });
  const sensorsQuery = useQuery({
    queryKey: ['sensors', 'dashboard'],
    queryFn: ({ signal }) => api.sensors.list({ page: 1, limit: 100, active: true }, signal)
  });

  useEffect(() => {
    if (!sensorId && sensorsQuery.data?.items.length) setSensorId(sensorsQuery.data.items[0].id);
  }, [sensorId, sensorsQuery.data]);

  const readingQuery = useQuery({
    queryKey: ['readings', sensorId, range.from, range.to, 'dashboard'],
    queryFn: ({ signal }) => api.sensors.readings(sensorId, { from: range.from, to: range.to, page: 1, limit: 500 }, signal),
    enabled: Boolean(sensorId)
  });

  if (summaryQuery.isPending || sensorsQuery.isPending) return <LoadingState label="Preparando la cabina de cultivo…" />;
  if (summaryQuery.isError) return <ErrorState message={getErrorMessage(summaryQuery.error)} onRetry={() => summaryQuery.refetch()} />;

  const summary = summaryQuery.data;
  const latestWithValues = summary.latestReadings.filter(
    (reading): reading is typeof reading & { value: number; recordedAt: string } =>
      reading.value !== null && reading.recordedAt !== null
  );
  const sensors = sensorsQuery.data?.items || [];
  const currentSensor = sensors.find((sensor) => sensor.id === sensorId);
  const chartData = (readingQuery.data?.items || []).map((reading) => ({
    value: reading.value,
    time: reading.recordedAt,
    label: formatDate(reading.recordedAt, true)
  }));

  return (
    <div className="page dashboard-page">
      <header className="page-header dashboard-header">
        <div>
          <span className="eyebrow">Vista general</span>
          <h1>El pulso de tu invernadero</h1>
          <p>Resumen de cultivos y sensores entre {formatDate(range.from)} y {formatDate(range.to)}.</p>
        </div>
        <div className="segmented-control" aria-label="Período del resumen">
          {periods.map((period) => (
            <button key={period.days} type="button" className={periodDays === period.days ? 'is-active' : ''} onClick={() => setPeriodDays(period.days)}>
              {period.label}
            </button>
          ))}
        </div>
      </header>

      <section className="climate-strip" aria-labelledby="climate-title">
        <div className="climate-strip__canopy" aria-hidden="true" />
        <div className="climate-strip__intro">
          <span className="signal-dot" />
          <div>
            <span className="eyebrow eyebrow--light">Franja climática</span>
            <h2 id="climate-title">{summary.greenhouse.name}</h2>
            <p>{summary.greenhouse.location || 'Ubicación no registrada'}</p>
          </div>
        </div>
        <div className="climate-strip__readings">
          {latestWithValues.length ? (
            latestWithValues.slice(0, 4).map((reading) => (
              <Link to={`/app/history?sensor=${reading.sensorId}`} className="climate-reading" key={reading.sensorId}>
                <span>{sensorTypeLabels[reading.type]}</span>
                <strong>{formatNumber(reading.value)} <small>{reading.unit}</small></strong>
                <time dateTime={reading.recordedAt}>{formatDate(reading.recordedAt, true)}</time>
              </Link>
            ))
          ) : (
            <div className="climate-strip__empty">
              <RadioTower size={20} />
              <span>Aún no hay lecturas recientes.</span>
            </div>
          )}
        </div>
      </section>

      <section className="metric-rail" aria-label="Resumen de actividad">
        <article>
          <span className="metric-rail__icon metric-rail__icon--leaf"><Sprout /></span>
          <div><strong>{summary.counts.cropsTotal}</strong><span>Cultivos</span></div>
          <small>{summary.counts.cropsActive} en cultivo</small>
        </article>
        <article>
          <span className="metric-rail__icon metric-rail__icon--water"><ThermometerSun /></span>
          <div><strong>{summary.counts.sensorsTotal}</strong><span>Sensores</span></div>
          <small>{summary.counts.sensorsActive} activos</small>
        </article>
        <article>
          <span className="metric-rail__icon metric-rail__icon--soil"><Activity /></span>
          <div><strong>{formatNumber(summary.counts.readingsInPeriod, 0)}</strong><span>Registros</span></div>
          <small>En este período</small>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="panel chart-panel" aria-labelledby="pulse-title">
          <div className="panel__header">
            <div>
              <span className="eyebrow">Historial reciente</span>
              <h2 id="pulse-title">Pulso del sensor</h2>
            </div>
            {sensors.length > 0 && (
              <label className="compact-select">
                <span className="sr-only">Sensor del gráfico</span>
                <select value={sensorId} onChange={(event) => setSensorId(event.target.value)}>
                  {sensors.map((sensor) => <option key={sensor.id} value={sensor.id}>{sensor.name}</option>)}
                </select>
              </label>
            )}
          </div>
          {!sensors.length ? (
            <EmptyState
              title="No hay sensores activos"
              description="Agrega un sensor para comenzar a construir el historial del invernadero."
              action={<Link className="button button--primary button--small" to="/app/sensors/new">Agregar sensor</Link>}
            />
          ) : readingQuery.isPending ? (
            <LoadingState label="Cargando registros…" />
          ) : readingQuery.isError ? (
            <ErrorState message={getErrorMessage(readingQuery.error)} onRetry={() => readingQuery.refetch()} />
          ) : !chartData.length ? (
            <EmptyState title="Sin registros en este período" description="Prueba con otro período o revisa nuevamente cuando el sensor haya enviado datos." />
          ) : (
            <>
              <div className="chart-summary">
                <span><Gauge size={17} /> {currentSensor?.name}</span>
                <strong>{formatNumber(chartData[chartData.length - 1].value)} <small>{currentSensor?.unit}</small></strong>
              </div>
              <div className="chart-wrap" role="img" aria-label={`Gráfico de ${currentSensor?.name} con ${chartData.length} registros`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="#dbe4df" vertical={false} />
                    <XAxis dataKey="time" tickFormatter={(value: string) => formatDate(value, periodDays <= 1)} tick={{ fill: '#607068', fontSize: 11 }} minTickGap={36} />
                    <YAxis tick={{ fill: '#607068', fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip labelFormatter={(value) => formatDate(String(value), true)} formatter={(value) => [`${formatNumber(Number(value))} ${currentSensor?.unit || ''}`, currentSensor?.name || 'Valor']} />
                    <Line type="monotone" dataKey="value" stroke="#2b7898" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#17392d' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <Link className="text-link panel__link" to={`/app/history?sensor=${sensorId}`}>
                Ver historial completo <ArrowRight size={16} />
              </Link>
            </>
          )}
        </section>

        <section className="panel dashboard-list" aria-labelledby="latest-title">
          <div className="panel__header">
            <div><span className="eyebrow">Sensores</span><h2 id="latest-title">Últimas lecturas</h2></div>
            <Link className="icon-button" to="/app/sensors" aria-label="Ver sensores"><ArrowRight /></Link>
          </div>
          {summary.latestReadings.length ? (
            <ul className="reading-list">
              {summary.latestReadings.slice(0, 6).map((reading) => (
                <li key={reading.sensorId}>
                  <span className={`sensor-mark sensor-mark--${reading.type.toLowerCase()}`}><ThermometerSun size={17} /></span>
                  <div><strong>{reading.sensorName}</strong><small>{sensorTypeLabels[reading.type]}</small></div>
                  <div className="reading-list__value">
                    <strong>{reading.value === null ? 'Sin registros' : `${formatNumber(reading.value)} ${reading.unit}`}</strong>
                    {reading.recordedAt && <time dateTime={reading.recordedAt}>{formatDate(reading.recordedAt, true)}</time>}
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="Sin lecturas" description="Los datos recientes de tus sensores aparecerán aquí." />}
        </section>

        <section className="panel recent-crops" aria-labelledby="crops-title">
          <div className="panel__header">
            <div><span className="eyebrow">Cuaderno botánico</span><h2 id="crops-title">Cultivos recientes</h2></div>
            <Link className="button button--secondary button--small" to="/app/crops">Ver todos</Link>
          </div>
          {summary.recentCrops.length ? (
            <div className="crop-notes-grid">
              {summary.recentCrops.slice(0, 4).map((crop, index) => (
                <Link className="crop-note" to={`/app/crops/${crop.id}/edit`} key={crop.id}>
                  <span className="crop-note__number">{String(index + 1).padStart(2, '0')}</span>
                  <Leaf size={19} />
                  <div><strong>{crop.name}</strong><span>{crop.species}{crop.variety ? ` · ${crop.variety}` : ''}</span></div>
                  <small>{cropStatusLabels[crop.status]}</small>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Tu cuaderno está vacío"
              description="Registra el primer cultivo para comenzar a organizar el invernadero."
              action={<Link className="button button--primary button--small" to="/app/crops/new">Crear cultivo</Link>}
            />
          )}
        </section>
      </div>
    </div>
  );
}
