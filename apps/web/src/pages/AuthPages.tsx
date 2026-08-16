import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Leaf, LockKeyhole, Mail, MapPin, Sprout } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { ApiError, getErrorMessage } from '../lib/api';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Ingresa tu correo.').email('Ingresa un correo válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.')
});

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Ingresa al menos 2 caracteres.').max(80, 'Usa un nombre más breve.'),
    email: z.string().trim().min(1, 'Ingresa tu correo.').email('Ingresa un correo válido.'),
    password: z.string().min(8, 'Usa al menos 8 caracteres.').max(72, 'Usa un máximo de 72 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña.')
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword']
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

function AuthArtwork() {
  return (
    <section className="auth-artwork" aria-label="Gestión integral del invernadero">
      <div className="auth-artwork__brand">
        <span><Sprout size={22} /></span>
        <strong>Savia</strong>
      </div>
      <div className="greenhouse-cut" aria-hidden="true">
        <div className="greenhouse-cut__sun" />
        <div className="greenhouse-cut__roof" />
        <div className="greenhouse-cut__bench greenhouse-cut__bench--one">
          <i /><i /><i /><i />
        </div>
        <div className="greenhouse-cut__bench greenhouse-cut__bench--two">
          <i /><i /><i />
        </div>
        <div className="greenhouse-cut__sensor"><span>23.8°</span></div>
      </div>
      <div className="auth-artwork__copy">
        <span className="eyebrow">Cabina de cultivo</span>
        <h1>Tu invernadero,<br />con historia.</h1>
        <p>Organiza cultivos, revisa sensores y entiende cómo cambia el ambiente con el tiempo.</p>
      </div>
      <div className="auth-artwork__facts">
        <span><Leaf size={17} /> Cultivos ordenados</span>
        <span><MapPin size={17} /> Un espacio privado</span>
      </div>
    </section>
  );
}

function PasswordField({
  label,
  error,
  registration,
  autoComplete = 'current-password'
}: {
  label: string;
  error?: string;
  registration: ReturnType<ReturnType<typeof useForm>['register']>;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={registration.name}>{label}</label>
      <div className={`input-with-icon ${error ? 'input-with-icon--error' : ''}`}>
        <LockKeyhole size={18} aria-hidden="true" />
        <input id={registration.name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} aria-invalid={Boolean(error)} {...registration} />
        <button className="input-icon-button" type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-layout">
      <AuthArtwork />
      <section className="auth-panel">{children}</section>
    </main>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values: LoginValues) => {
    setSubmitError('');
    try {
      await login(values);
      const destination = (location.state as { from?: string } | null)?.from || '/app';
      navigate(destination, { replace: true });
    } catch (error) {
      setSubmitError(error instanceof ApiError && error.status === 401 ? 'El correo o la contraseña no coinciden.' : getErrorMessage(error));
    }
  };

  return (
    <AuthFrame>
      <div className="auth-form-wrap">
        <span className="eyebrow">Bienvenido de vuelta</span>
        <h2>Entra a tu invernadero</h2>
        <p className="auth-intro">Consulta el estado de tus cultivos y el historial de cada sensor.</p>
        <form className="form-stack" onSubmit={handleSubmit(onSubmit)} noValidate>
          {submitError && <div className="form-alert" role="alert">{submitError}</div>}
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <div className={`input-with-icon ${errors.email ? 'input-with-icon--error' : ''}`}>
              <Mail size={18} aria-hidden="true" />
              <input id="email" type="email" autoComplete="email" placeholder="nombre@correo.cl" aria-invalid={Boolean(errors.email)} {...register('email')} />
            </div>
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </div>
          <PasswordField label="Contraseña" error={errors.password?.message} registration={register('password')} />
          <button className="button button--primary button--wide" type="submit" disabled={isSubmitting || !navigator.onLine}>
            {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
        <p className="auth-switch">¿Aún no tienes cuenta? <Link to="/register">Crear cuenta</Link></p>
      </div>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' }
  });

  const onSubmit = async ({ confirmPassword: _confirmPassword, ...values }: RegisterValues) => {
    setSubmitError('');
    try {
      await registerAccount(values);
      navigate('/app', { replace: true });
    } catch (error) {
      setSubmitError(error instanceof ApiError && error.status === 409 ? 'Ya existe una cuenta con ese correo.' : getErrorMessage(error));
    }
  };

  return (
    <AuthFrame>
      <div className="auth-form-wrap auth-form-wrap--register">
        <span className="eyebrow">Primera siembra</span>
        <h2>Crea tu cuenta</h2>
        <p className="auth-intro">Al registrarte se creará un único invernadero asociado a tu usuario.</p>
        <form className="form-stack" onSubmit={handleSubmit(onSubmit)} noValidate>
          {submitError && <div className="form-alert" role="alert">{submitError}</div>}
          <div className="field">
            <label htmlFor="name">Nombre</label>
            <input id="name" type="text" autoComplete="name" aria-invalid={Boolean(errors.name)} {...register('name')} />
            {errors.name && <span className="field-error">{errors.name.message}</span>}
          </div>
          <div className="field">
            <label htmlFor="register-email">Correo electrónico</label>
            <input id="register-email" type="email" autoComplete="email" placeholder="nombre@correo.cl" aria-invalid={Boolean(errors.email)} {...register('email')} />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </div>
          <PasswordField label="Contraseña" error={errors.password?.message} registration={register('password')} autoComplete="new-password" />
          <PasswordField label="Confirmar contraseña" error={errors.confirmPassword?.message} registration={register('confirmPassword')} autoComplete="new-password" />
          <button className="button button--primary button--wide" type="submit" disabled={isSubmitting || !navigator.onLine}>
            {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>
        <p className="auth-switch">¿Ya tienes una cuenta? <Link to="/login">Iniciar sesión</Link></p>
      </div>
    </AuthFrame>
  );
}
