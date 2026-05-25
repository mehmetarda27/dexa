import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { X } from 'lucide-react';

const ToastContext = createContext({
  notify: () => {},
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    ({ title, message, type = 'info' }) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, title, message, type }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[80] grid w-[min(92vw,380px)] gap-3">
        {toasts.map((toast) => (
          <article
            key={toast.id}
            className={`rounded-2xl border p-4 shadow-[0_22px_70px_rgba(0,0,0,0.62)] ${
              toast.type === 'error'
                ? 'border-rose-300/25 bg-[#2a1320] text-rose-50'
                : 'border-dexa-cyan/25 bg-[#0d243a] text-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong className="block text-sm">{toast.title}</strong>
                {toast.message && <p className="mt-1 text-sm opacity-80">{toast.message}</p>}
              </div>
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Bildirimi kapat">
                <X size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
