import { ReactNode, createContext, useContext, useState, useCallback } from 'react';
import { statusColor, statusLabel } from '../lib/format';

export function Badge({ status }: { status: string | null | undefined }) {
  return <span className={`badge ${statusColor(status)}`}>{statusLabel(status)}</span>;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-10 ${className ?? ''}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="text-4xl">🗂️</div>
      <p className="font-bold text-slate-600">{title}</p>
      {hint && <p className="text-sm text-slate-400">{hint}</p>}
    </div>
  );
}

export function Stat({ label, value, icon, accent }: { label: string; value: ReactNode; icon?: string; accent?: string }) {
  return (
    <div className="card p-5 fade-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value">{value}</p>
        </div>
        {icon && <span className={`text-2xl ${accent ?? ''}`}>{icon}</span>}
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 shadow-2xl fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-night">{title}</h3>
          <button className="btn btn-ghost px-2 py-1 text-xl" onClick={onClose} aria-label="غلق">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface ToastItem { id: number; kind: 'success' | 'error'; text: string; }
interface ToastCtx { toast: (kind: 'success' | 'error', text: string) => void; }
const ToastContext = createContext<ToastCtx>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((kind: 'success' | 'error', text: string) => {
    const id = Date.now() + Math.random();
    setItems(prev => [...prev, { id, kind, text }]);
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-100 flex -translate-x-1/2 flex-col gap-2">
        {items.map(t => (
          <div key={t.id} className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg fade-up ${t.kind === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function Confirm({ open, onClose, onConfirm, title, children }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; children?: ReactNode }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {children}
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn btn-outline" onClick={onClose}>إلغاء</button>
          <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>تأكيد</button>
        </div>
      </div>
    </Modal>
  );
}

export function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="label">{label}{required && <span className="text-rose-500"> *</span>}</span>
      {children}
    </label>
  );
}