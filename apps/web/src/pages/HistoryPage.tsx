import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { Activity, CalendarRange, ChevronDown, Gauge, RadioTower } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState, ErrorState, LoadingState } from '../components/PageStates';
import { Pagination } from '../components/Pagination';
import { api, getErrorMessage } from '../lib/api';
import { formatDate, formatNumber, sensorTypeLabels } from '../lib/format';

const presets = [
  { label: '24 horas', days: 1 },
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 }
];

function dateInput(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const initialFrom = params.get('from') || dateInput(subDays(new Date(), 7));
  const initialTo = params.get('to') || dateInput(new Date());
  const [fromInput, setFromInput] = useState(initialFrom);
  const [toInput, setToInput] = useState(initialTo);
  const sensorId = params.get('sensor') || '';
  const from = params.get('from') || initialFrom;
  const to = params.get('to') || initialTo;
  const page = Number(params.get('page') || 1);
  const dateError = Boolean(fromInput && toInput && fromInput > toInput);

  const sensorsQuery = useQuery({
    queryKey: ['sensors', 'history-selector'],
    queryFn: ({ signal }) => api.sensors.list({ page: 1, limit: 100 }, signal)
  });

  useEffect(() => {
    if (!sensorId && sensorsQuery.data?.items.length) {
      const next = new URLSearchParams(params);
      next.set('sensor', sensorsQuery.data.items[0].id);
      next.set('from', initialFrom);
      next.set('to', initialTo);
      setParams(next, { replace: true });
    }
  }, [initialFrom, initialTo, params, sensorId, sensorsQuery.data, setParams]);

  const range = useMemo(() => ({
    from: startOfDay(new Date(`${from}T12:00:00`)).toISOString(),
    to: endOfDay(new Date(`${to}T12:00:00`)).toISOString()
  }), [from, to]);

  const readingsQuery = useQuery({
    queryKey: ['readings', sensorId, range.from, range.to, page, 'history'],
    queryFn: ({ signal }) => api.sensors.readings(sensorId, { ...range, page, limit: 100 }, signal),
    enabled: Boolean(sensorId && from && to && from <= to),
    placeholderData: (previous) => previous
  });

  const sensors = sensorsQuery.data?.items || [];
  const sensor = sensors.find((item) => item.id === sensorId) || readingsQuery.data?.meta.sensor;
  const readings = readingsQuery.data?.items || [];
  const chartData = [...readings].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const tableData = [...readings].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const average = readings.length ? readings.reduce((sum, item) => sum + item.value, 0) / readings.length : 0;
  const minimum = readings.length ? Math.min(...readings.map((item) => item.value)) : 0;
  const maximum = readings.length ? Math.max(...readings.map((item) => item.value)) : 0;

  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    if (!('page' in updates)) next.delete('page');
    setParams(next);
  };

  const applyPreset = (days: number) => {
    const nextFrom = dateInput(subDays(new Date(), days));
    const nextTo = dateInput(new Date());
    setFromInput(nextFrom);
    setToInput(nextTo);
    updateParams({ from: nextFrom, to: nextTo });
  };

  return (
    <div className="page history-page">
      <header className="page-header">
        <div><span className="eyebrow">Registro histórico</span><h1>Historial de sensores</h1><p>Compara lecturas dentro de un período y revisa cada valor registrado.</p></div>
      </header>

      <section className="history-controls" aria-label="Filtros del historial">
        <label className="instrument-select">
          <span>Sensor</span>
          <div><RadioTower size={18} /><select value={sensorId} onChange={(event) => updateParams({ sensor: event.target.value })} disabled={sensorsQuery.isPending}><option value="">Selecciona un sensor</option>{sensors.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</select><ChevronDown size={17} /></div>
        </label>
        <div className="period-presets" aria-label="Períodos rápidos">{presets.map((preset) => <button type="button" key={preset.days} onClick={() => applyPreset(preset.days)}>{preset.label}</button>)}</div>
        <form className="date-range-form" onSubmit={(event) => { event.preventDefault(); if (!dateError) updateParams({ from: fromInput, to: toInput }); }}>
          <label><span>Desde</span><input type="date" value={fromInput} max={toInput || undefined} onChange={(event) => setFromInput(event.target.value)} /></label>
          <span className="date-range-form__dash">—</span>
          <label><span>Hasta</span><input type="date" value={toInput} min={fromInput || undefined} onChange={(event) => setToInput(event.target.value)} /></label>
          <button className="button button--secondary button--small" type="submit" disabled={dateError || !fromInput || !toInput}>Aplicar</button>
          {dateError && <span className="field-error date-range-form__error">La fecha inicial debe ser anterior a la final.</span>}
        </form>
      </section>

      {sensorsQuery.isPending ? <LoadingState label="Cargando sensores…" /> : sensorsQuery.isError ? <ErrorState message={getErrorMessage(sensorsQuery.error)} onRetry={() => sensorsQuery.refetch()} /> : !sensors.length ? (
        <EmptyState title="No hay sensores disponibles" description="Crea un sensor para poder consultar su historial." />
      ) : readingsQuery.isPending ? <LoadingState label="Consultando registros del período…" /> : readingsQuery.isError ? <ErrorState message={getErrorMessage(readingsQuery.error)} onRetry={() => readingsQuery.refetch()} /> : !readings.length ? (
        <EmptyState title="Sin registros en este período" description={`“${sensor?.name || 'Este sensor'}” no tiene lecturas entre ${formatDate(range.from)} y ${formatDate(range.to)}.`} />
      ) : (
        <>
          <section className="history-summary" aria-label="Resumen del período">
            <article><span><Activity size={17} /> Muestras</span><strong>{readingsQuery.data?.meta.total ?? readings.length}</strong><small>En el período</small></article>
            <article><span><Gauge size={17} /> Promedio visible</span><strong>{formatNumber(average)} <small>{sensor?.unit}</small></strong><small>De esta página</small></article>
            <article><span>Mínimo visible</span><strong>{formatNumber(minimum)} <small>{sensor?.unit}</small></strong><small>{formatDate(from)} — {formatDate(to)}</small></article>
            <article><span>Máximo visible</span><strong>{formatNumber(maximum)} <small>{sensor?.unit}</small></strong><small>{sensor ? sensorTypeLabels[sensor.type] : 'Lectura'}</small></article>
          </section>

          <section className="panel history-chart" aria-labelledby="history-chart-title">
            <div className="panel__header"><div><span className="eyebrow">{sensor ? sensorTypeLabels[sensor.type] : 'Lecturas'}</span><h2 id="history-chart-title">{sensor?.name}</h2></div><span className="period-label"><CalendarRange size={16} /> {formatDate(range.from)} — {formatDate(range.to)}</span></div>
            <p id="history-chart-description" className="sr-only">El gráfico muestra {chartData.length} lecturas visibles. El promedio de esta página es {formatNumber(average)} {sensor?.unit}.</p>
            <div className="chart-wrap chart-wrap--history" role="img" aria-labelledby="history-chart-title history-chart-description">
              <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 12, right: 18, left: -12, bottom: 4 }}><CartesianGrid stroke="#dbe4df" vertical={false} /><XAxis dataKey="recordedAt" tickFormatter={(value: string) => formatDate(value, from === to)} minTickGap={42} tick={{ fill: '#607068', fontSize: 11 }} /><YAxis domain={['auto', 'auto']} tick={{ fill: '#607068', fontSize: 11 }} /><Tooltip labelFormatter={(value) => formatDate(String(value), true)} formatter={(value) => [`${formatNumber(Number(value))} ${sensor?.unit || ''}`, sensor?.name || 'Valor']} /><ReferenceLine y={average} stroke="#b5653d" strokeDasharray="5 5" /><Line dataKey="value" type="monotone" stroke="#2b7898" strokeWidth={3} dot={chartData.length < 30} activeDot={{ r: 5, fill: '#17392d' }} /></LineChart></ResponsiveContainer>
            </div>
            {(readingsQuery.data?.meta.total || 0) > readings.length && <p className="chart-note">El gráfico representa los {readings.length} registros de esta página. Usa la paginación para revisar el resto.</p>}
          </section>

          <section className="panel data-panel" aria-labelledby="reading-table-title">
            <div className="data-panel__heading"><div><span className="eyebrow">Detalle accesible</span><h2 id="reading-table-title">Registros del período</h2></div><span className="mono">Zona horaria: America/Santiago</span></div>
            <div className="table-wrap"><table className="data-table responsive-table"><thead><tr><th>Fecha y hora</th><th>Sensor</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>{tableData.map((reading) => <tr key={reading.id}><td data-label="Fecha y hora"><time dateTime={reading.recordedAt}>{formatDate(reading.recordedAt, true)}</time></td><td data-label="Sensor">{sensor?.name}</td><td data-label="Tipo">{sensor ? sensorTypeLabels[sensor.type] : '—'}</td><td data-label="Valor"><strong className="mono">{formatNumber(reading.value)} {sensor?.unit}</strong></td></tr>)}</tbody></table></div>
            {readingsQuery.data?.meta && <Pagination page={readingsQuery.data.meta.page} limit={readingsQuery.data.meta.limit} total={readingsQuery.data.meta.total} onPageChange={(next) => updateParams({ page: String(next) })} />}
          </section>
        </>
      )}
    </div>
  );
}
