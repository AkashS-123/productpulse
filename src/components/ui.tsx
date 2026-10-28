import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { TONES, Tone } from '../constants';
import type { Query } from '../hooks/useFetch';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' };
export function Button({ variant = 'primary', className, type = 'button', ...rest }: BtnProps) {
  const styles = {
    primary: 'bg-brand text-white shadow-sm hover:brightness-110 active:scale-[.98]',
    secondary: 'border border-slate-300 bg-surface text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };
  return (
    <button type={type} {...rest}
      className={cx('inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50', styles[variant], className)} />
  );
}

const field = 'field w-full rounded-xl border border-slate-300 bg-surface px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand focus:outline-none disabled:bg-slate-100';
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(field, p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={4} {...p} className={cx(field, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(field, p.className)} />;

export function Field({ label, error, hint, group, children }: { label: string; error?: string; hint?: string; group?: boolean; children: ReactNode }) {
  const Tag = group ? 'div' : 'label';
  return (
    <Tag className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs text-red-600">{error}</span>}
    </Tag>
  );
}

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cx('rounded-2xl border border-slate-200 bg-surface p-5 shadow-card', className)}>{children}</div>
);

export const Badge = ({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) => (
  <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', TONES[tone])}>{children}</span>
);

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const Spinner = () => (
  <div className="flex justify-center py-16" role="status" aria-label="Loading">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand" />
  </div>
);

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-surface px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <p className="font-semibold text-red-800">Could not load data</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry && <Button variant="secondary" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function QueryBoundary<T>({ q, children }: { q: Query<T>; children: (d: T) => ReactNode }) {
  if (q.error && !q.data) return <ErrorState message={q.error} onRetry={q.reload} />;
  if (!q.data) return <Spinner />;
  return <>{children(q.data)}</>;
}

export function Modal({ open, title, onClose, children, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={cx('pop my-8 w-full rounded-2xl bg-surface shadow-lift ring-1 ring-slate-200', wide ? 'max-w-2xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:text-slate-700">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', busy, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel?: string; busy?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</Button>
      </div>
    </Modal>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? value / max : 0;
  const color = ratio >= 1 ? 'bg-red-500' : ratio >= 0.8 ? 'bg-amber-500' : 'bg-brand';
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={cx('h-full rounded-full', color)} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
    </div>
  );
}

export function LimitBanner({ label, used, limit }: { label: string; used: number; limit: number }) {
  if (limit <= 0 || used / limit < 0.8) return null;
  const full = used >= limit;
  return (
    <div role="alert" className={cx('mb-4 rounded-lg border px-4 py-3 text-sm', full ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900')}>
      {full ? `You have reached the ${label} limit (${used}/${limit}). Upgrade your plan to add more.`
        : `You have used ${used} of ${limit} ${label}. You are close to your plan limit.`}
    </div>
  );
}

export const TagPill = ({ children }: { children: ReactNode }) => (
  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">#{children}</span>
);

export const inputErr = (e?: string) => (e ? 'border-red-400' : '');
