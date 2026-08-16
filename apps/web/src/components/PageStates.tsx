import type { ReactNode } from 'react';
import { CircleAlert, LoaderCircle, Sprout, WifiOff } from 'lucide-react';

export function LoadingState({ label = 'Cargando información…' }: { label?: string }) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <LoaderCircle className="spin" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-panel state-panel--error" role="alert">
      <CircleAlert aria-hidden="true" />
      <div>
        <h2>No pudimos cargar esta sección</h2>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button className="button button--secondary" type="button" onClick={onRetry}>
          Intentar nuevamente
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="state-panel state-panel--empty">
      <Sprout aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function OfflineBanner() {
  return (
    <div className="offline-banner" role="status">
      <WifiOff size={16} aria-hidden="true" />
      Sin conexión. Puedes revisar esta pantalla, pero las acciones de guardado están pausadas.
    </div>
  );
}
