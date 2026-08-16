import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Building2, LogOut, Mail, MapPin, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, ApiError, getErrorMessage } from '../lib/api';
import type { AuthSession } from '../types';

const greenhouseSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa al menos 2 caracteres.').max(100, 'Usa un nombre más breve.'),
  location: z.string().trim().max(160, 'Usa una ubicación más breve.').optional()
});

type GreenhouseValues = z.infer<typeof greenhouseSchema>;

export function AccountPage() {
  const { session, logout, isAuthenticating } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { register, handleSubmit, reset, setError, formState: { errors, isDirty } } = useForm<GreenhouseValues>({
    resolver: zodResolver(greenhouseSchema),
    defaultValues: { name: session?.greenhouse.name || '', location: session?.greenhouse.location || '' }
  });

  useEffect(() => {
    reset({ name: session?.greenhouse.name || '', location: session?.greenhouse.location || '' });
  }, [reset, session?.greenhouse]);

  const updateMutation = useMutation({
    mutationFn: api.greenhouse.update,
    onSuccess: (greenhouse) => {
      queryClient.setQueryData<AuthSession>(['session'], (current) => current ? { ...current, greenhouse } : current);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      reset({ name: greenhouse.name, location: greenhouse.location || '' });
      showToast('Información del invernadero actualizada.', 'success');
    }
  });

  const submit = async (values: GreenhouseValues) => {
    try { await updateMutation.mutateAsync({ name: values.name, location: values.location || '' }); }
    catch (error) {
      if (error instanceof ApiError && error.fields) Object.entries(error.fields).forEach(([field, message]) => field in values && setError(field as keyof GreenhouseValues, { message: Array.isArray(message) ? message[0] : message }));
      else showToast(getErrorMessage(error), 'error');
    }
  };

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    navigate('/login', { replace: true });
  };

  return (
    <div className="page account-page">
      <header className="page-header"><div><span className="eyebrow">Configuración</span><h1>Cuenta e invernadero</h1><p>Revisa tu sesión y mantén actualizada la identificación de tu espacio.</p></div></header>

      {session?.user.role === 'ADMIN' && (
        <section className="admin-entry" aria-labelledby="admin-entry-title">
          <span className="admin-entry__icon"><ShieldCheck /></span>
          <div><span className="eyebrow eyebrow--light">Acceso restringido</span><h2 id="admin-entry-title">Panel administrativo</h2><p>Consulta estadísticas globales y recursos asociados a cada usuario.</p></div>
          <div className="admin-entry__actions"><Link className="button button--light" to="/admin"><BarChart3 size={17} /> Resumen</Link><Link className="button button--light" to="/admin/users"><UsersRound size={17} /> Usuarios</Link></div>
        </section>
      )}

      <div className="account-grid">
        <section className="panel profile-card" aria-labelledby="profile-title">
          <div className="profile-card__avatar">{session?.user.name.slice(0, 1).toUpperCase()}</div>
          <div><span className="eyebrow">Tu sesión</span><h2 id="profile-title">{session?.user.name}</h2><span className={`status status--${session?.user.role === 'ADMIN' ? 'soil' : 'success'}`}>{session?.user.role === 'ADMIN' ? 'Administrador' : 'Usuario'}</span></div>
          <dl><div><dt><Mail size={16} /> Correo</dt><dd>{session?.user.email}</dd></div><div><dt><UserRound size={16} /> Identificador</dt><dd className="mono">{session?.user.id}</dd></div></dl>
          <button className="button button--secondary button--wide" type="button" onClick={handleLogout} disabled={isAuthenticating}><LogOut size={17} /> Cerrar sesión</button>
        </section>

        <form className="panel greenhouse-form" onSubmit={handleSubmit(submit)} noValidate>
          <div className="panel__header"><div><span className="eyebrow">Único por cuenta</span><h2>Tu invernadero</h2></div><span className="entity-icon entity-icon--leaf"><Building2 /></span></div>
          <p>Este nombre aparecerá en la cabecera y en el resumen principal.</p>
          <div className="field"><label htmlFor="greenhouse-name">Nombre</label><input id="greenhouse-name" aria-invalid={Boolean(errors.name)} {...register('name')} />{errors.name && <span className="field-error">{errors.name.message}</span>}</div>
          <div className="field"><label htmlFor="greenhouse-location">Ubicación <span className="optional">Opcional</span></label><div className="input-with-icon"><MapPin size={18} /><input id="greenhouse-location" placeholder="Ej. Campus norte, Santiago" aria-invalid={Boolean(errors.location)} {...register('location')} /></div>{errors.location && <span className="field-error">{errors.location.message}</span>}</div>
          <div className="form-actions form-actions--inline"><button className="button button--primary" type="submit" disabled={!isDirty || updateMutation.isPending || !navigator.onLine}>{updateMutation.isPending ? 'Guardando…' : 'Guardar cambios'}</button></div>
        </form>
      </div>
    </div>
  );
}
