import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, FilterX, Leaf, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { EmptyState, ErrorState, LoadingState } from '../components/PageStates';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { useToast } from '../context/ToastContext';
import { api, ApiError, getErrorMessage } from '../lib/api';
import { cropStatusLabels, formatDate, toDateInput } from '../lib/format';
import type { Crop, CropInput, CropStatus } from '../types';

const cropSchema = z
  .object({
    name: z.string().trim().min(2, 'Ingresa al menos 2 caracteres.').max(80, 'Usa un nombre más breve.'),
    species: z.string().trim().min(2, 'Indica la especie.').max(80, 'Usa un máximo de 80 caracteres.'),
    variety: z.string().trim().max(80, 'Usa un máximo de 80 caracteres.').optional(),
    status: z.enum(['PLANNED', 'ACTIVE', 'HARVESTED', 'CANCELLED']),
    plantedAt: z.string().min(1, 'Indica la fecha de siembra.'),
    expectedHarvestAt: z.string().optional(),
    notes: z.string().trim().max(1000, 'Usa un máximo de 1000 caracteres.').optional()
  })
  .refine(
    (values) => !values.plantedAt || !values.expectedHarvestAt || values.expectedHarvestAt >= values.plantedAt,
    { message: 'La cosecha estimada no puede ser anterior a la siembra.', path: ['expectedHarvestAt'] }
  );

type CropFormValues = z.infer<typeof cropSchema>;

function statusTone(status: CropStatus) {
  return status === 'ACTIVE' ? 'success' : status === 'PLANNED' ? 'info' : status === 'HARVESTED' ? 'soil' : 'neutral';
}

export function CropsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [deleteTarget, setDeleteTarget] = useState<Crop | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const page = Number(searchParams.get('page') || 1);
  const status = searchParams.get('status') || '';
  const plantedFrom = searchParams.get('plantedFrom') || '';
  const plantedTo = searchParams.get('plantedTo') || '';
  const activeQuery = searchParams.get('q') || '';

  useEffect(() => setQuery(activeQuery), [activeQuery]);

  const cropsQuery = useQuery({
    queryKey: ['crops', activeQuery, status, plantedFrom, plantedTo, page],
    queryFn: ({ signal }) => api.crops.list({ q: activeQuery, status, plantedFrom, plantedTo, page, limit: 12 }, signal),
    placeholderData: (previous) => previous
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.crops.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteTarget(null);
      showToast('Cultivo eliminado.', 'success');
    },
    onError: (error) => showToast(getErrorMessage(error), 'error')
  });

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  const resetFilters = () => {
    setQuery('');
    setSearchParams({});
  };

  const hasFilters = Boolean(activeQuery || status || plantedFrom || plantedTo);
  const crops = cropsQuery.data?.items || [];
  const meta = cropsQuery.data?.meta;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Cuaderno botánico</span>
          <h1>Cultivos</h1>
          <p>Registra cada cultivo y encuentra rápidamente lo que está creciendo.</p>
        </div>
        <Link className="button button--primary" to="/app/crops/new"><Plus size={18} /> Nuevo cultivo</Link>
      </header>

      <form
        className="filter-panel"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setFilter('q', query.trim());
        }}
      >
        <div className="search-field">
          <Search size={18} aria-hidden="true" />
          <label className="sr-only" htmlFor="crop-search">Buscar cultivos</label>
          <input id="crop-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o especie" />
          <button className="button button--secondary button--small" type="submit">Buscar</button>
        </div>
        <label className="filter-field">
          <span>Estado</span>
          <select value={status} onChange={(event) => setFilter('status', event.target.value)}>
            <option value="">Todos</option>
            {Object.entries(cropStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Siembra desde</span>
          <input type="date" value={plantedFrom} onChange={(event) => setFilter('plantedFrom', event.target.value)} />
        </label>
        <label className="filter-field">
          <span>Siembra hasta</span>
          <input type="date" value={plantedTo} onChange={(event) => setFilter('plantedTo', event.target.value)} />
        </label>
        {hasFilters && <button className="button button--ghost button--small filter-reset" type="button" onClick={resetFilters}><FilterX size={17} /> Limpiar</button>}
      </form>

      {cropsQuery.isPending ? (
        <LoadingState label="Consultando cultivos…" />
      ) : cropsQuery.isError ? (
        <ErrorState message={getErrorMessage(cropsQuery.error)} onRetry={() => cropsQuery.refetch()} />
      ) : !crops.length ? (
        <EmptyState
          title={hasFilters ? 'No hay cultivos que coincidan' : 'Aún no has registrado cultivos'}
          description={hasFilters ? 'Modifica los filtros o limpia la búsqueda para ver más resultados.' : 'Crea tu primer cultivo para comenzar el cuaderno botánico.'}
          action={hasFilters ? <button className="button button--secondary" type="button" onClick={resetFilters}>Limpiar filtros</button> : <Link className="button button--primary" to="/app/crops/new"><Plus size={18} /> Crear cultivo</Link>}
        />
      ) : (
        <section className="panel data-panel" aria-labelledby="crop-results-title">
          <div className="data-panel__heading">
            <div><span className="eyebrow">Resultados</span><h2 id="crop-results-title">{meta?.total ?? crops.length} cultivos</h2></div>
            {cropsQuery.isFetching && <span className="subtle-status">Actualizando…</span>}
          </div>
          <div className="table-wrap">
            <table className="data-table responsive-table">
              <thead><tr><th>Cultivo</th><th>Estado</th><th>Siembra</th><th>Cosecha estimada</th><th><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {crops.map((crop) => (
                  <tr key={crop.id}>
                    <td data-label="Cultivo"><div className="entity-cell"><span className="entity-icon entity-icon--leaf"><Leaf size={18} /></span><span><strong>{crop.name}</strong><small>{crop.species}{crop.variety ? ` · ${crop.variety}` : ''}</small></span></div></td>
                    <td data-label="Estado"><span className={`status status--${statusTone(crop.status)}`}>{cropStatusLabels[crop.status]}</span></td>
                    <td data-label="Siembra"><span className="date-cell"><CalendarDays size={15} /> {formatDate(crop.plantedAt)}</span></td>
                    <td data-label="Cosecha estimada">{formatDate(crop.expectedHarvestAt)}</td>
                    <td className="table-actions">
                      <Link className="icon-button" to={`/app/crops/${crop.id}/edit`} aria-label={`Editar ${crop.name}`}><Pencil size={17} /></Link>
                      <button className="icon-button icon-button--danger" type="button" onClick={() => setDeleteTarget(crop)} aria-label={`Eliminar ${crop.name}`}><Trash2 size={17} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && <Pagination page={meta.page} limit={meta.limit} total={meta.total} onPageChange={(nextPage) => setFilter('page', String(nextPage))} />}
        </section>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        title="Eliminar cultivo"
        description={`Esta acción eliminará “${deleteTarget?.name}” de tu invernadero.`}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
        footer={
          <>
            <button className="button button--ghost" type="button" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>Cancelar</button>
            <button className="button button--danger" type="button" disabled={deleteMutation.isPending || !navigator.onLine} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              <Trash2 size={17} /> {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar cultivo'}
            </button>
          </>
        }
      >
        <p>No podrás recuperar este registro después de confirmar.</p>
      </Modal>
    </div>
  );
}

export function CropFormPage() {
  const { cropId } = useParams();
  const editing = Boolean(cropId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const cropQuery = useQuery({
    queryKey: ['crop', cropId],
    queryFn: ({ signal }) => api.crops.get(cropId!, signal),
    enabled: editing
  });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<CropFormValues>({
    resolver: zodResolver(cropSchema),
    defaultValues: { name: '', species: '', variety: '', status: 'ACTIVE', plantedAt: '', expectedHarvestAt: '', notes: '' }
  });

  useEffect(() => {
    if (!cropQuery.data) return;
    reset({
      name: cropQuery.data.name,
      species: cropQuery.data.species,
      variety: cropQuery.data.variety || '',
      status: cropQuery.data.status,
      plantedAt: toDateInput(cropQuery.data.plantedAt),
      expectedHarvestAt: toDateInput(cropQuery.data.expectedHarvestAt),
      notes: cropQuery.data.notes || ''
    });
  }, [cropQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: CropInput) => editing ? api.crops.update(cropId!, values) : api.crops.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showToast(editing ? 'Cambios guardados.' : 'Cultivo creado.', 'success');
      navigate('/app/crops');
    }
  });

  const submit = async (values: CropFormValues) => {
    const payload: CropInput = {
      ...values,
      variety: values.variety || undefined,
      plantedAt: values.plantedAt,
      expectedHarvestAt: values.expectedHarvestAt || undefined,
      notes: values.notes || undefined
    };
    try {
      await saveMutation.mutateAsync(payload);
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        Object.entries(error.fields).forEach(([field, message]) => {
          if (field in values) setError(field as keyof CropFormValues, { message: Array.isArray(message) ? message[0] : message });
        });
      } else showToast(getErrorMessage(error), 'error');
    }
  };

  if (editing && cropQuery.isPending) return <LoadingState label="Cargando cultivo…" />;
  if (cropQuery.isError) return <ErrorState message={getErrorMessage(cropQuery.error)} onRetry={() => cropQuery.refetch()} />;

  return (
    <div className="page form-page">
      <Link className="back-link" to="/app/crops"><ArrowLeft size={17} /> Volver a cultivos</Link>
      <header className="page-header form-page__header">
        <div><span className="eyebrow">Cuaderno botánico</span><h1>{editing ? 'Editar cultivo' : 'Nuevo cultivo'}</h1><p>Los datos se asociarán únicamente a tu invernadero.</p></div>
      </header>
      <form className="form-layout" onSubmit={handleSubmit(submit)} noValidate>
        <section className="panel form-card">
          <div className="form-section-heading"><span className="form-section-heading__number">01</span><div><h2>Identificación</h2><p>Información para reconocer el cultivo.</p></div></div>
          <div className="form-grid form-grid--two">
            <div className="field"><label htmlFor="crop-name">Nombre del cultivo</label><input id="crop-name" placeholder="Ej. Tomates del bancal norte" aria-invalid={Boolean(errors.name)} {...register('name')} />{errors.name && <span className="field-error">{errors.name.message}</span>}</div>
            <div className="field"><label htmlFor="crop-species">Especie</label><input id="crop-species" placeholder="Ej. Solanum lycopersicum" aria-invalid={Boolean(errors.species)} {...register('species')} />{errors.species && <span className="field-error">{errors.species.message}</span>}</div>
            <div className="field"><label htmlFor="crop-variety">Variedad <span className="optional">Opcional</span></label><input id="crop-variety" placeholder="Ej. Cherry" aria-invalid={Boolean(errors.variety)} {...register('variety')} />{errors.variety && <span className="field-error">{errors.variety.message}</span>}</div>
            <div className="field"><label htmlFor="crop-status">Estado</label><select id="crop-status" {...register('status')}>{Object.entries(cropStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          </div>
        </section>
        <section className="panel form-card">
          <div className="form-section-heading"><span className="form-section-heading__number">02</span><div><h2>Calendario</h2><p>Fechas de referencia para la temporada.</p></div></div>
          <div className="form-grid form-grid--two">
            <div className="field"><label htmlFor="planted-at">Fecha de siembra</label><input id="planted-at" type="date" aria-invalid={Boolean(errors.plantedAt)} {...register('plantedAt')} />{errors.plantedAt && <span className="field-error">{errors.plantedAt.message}</span>}</div>
            <div className="field"><label htmlFor="harvest-at">Cosecha estimada <span className="optional">Opcional</span></label><input id="harvest-at" type="date" min={watch('plantedAt') || undefined} aria-invalid={Boolean(errors.expectedHarvestAt)} {...register('expectedHarvestAt')} />{errors.expectedHarvestAt && <span className="field-error">{errors.expectedHarvestAt.message}</span>}</div>
          </div>
        </section>
        <section className="panel form-card">
          <div className="form-section-heading"><span className="form-section-heading__number">03</span><div><h2>Notas</h2><p>Observaciones útiles para próximas revisiones.</p></div></div>
          <div className="field"><label htmlFor="crop-notes">Notas <span className="optional">Opcional</span></label><textarea id="crop-notes" rows={5} placeholder="Riego, trasplante u otras observaciones…" aria-invalid={Boolean(errors.notes)} {...register('notes')} />{errors.notes && <span className="field-error">{errors.notes.message}</span>}</div>
        </section>
        <div className="form-actions">
          <Link className="button button--ghost" to="/app/crops">Cancelar</Link>
          <button className="button button--primary" type="submit" disabled={isSubmitting || saveMutation.isPending || !navigator.onLine || (editing && !isDirty)}>
            {saveMutation.isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cultivo'}
          </button>
        </div>
      </form>
    </div>
  );
}
