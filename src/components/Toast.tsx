/* =========================================================================
   Toasts efímeros · notificaciones de acción (éxito / error)
   La región aria-live está siempre montada para que los lectores de pantalla
   anuncien cada mensaje; el toast se puede cerrar manualmente.
   ========================================================================= */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { icons } from "@/components/icons";

type Toast = { id: number; text: string; error: boolean };
type ToastApi = { notify: (text: string, error?: boolean) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const notify = useCallback((text: string, error = false) => {
    seq.current += 1;
    setToast({ id: seq.current, text, error });
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (timer.current) clearTimeout(timer.current);
    // Los errores se leen con más calma: permanecen más tiempo.
    timer.current = setTimeout(() => setToast(null), toast.error ? 6500 : 3600);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [toast]);

  // Valor estable: evita re-renderizar a todos los consumidores cada vez que aparece un toast.
  const value = useMemo(() => ({ notify }), [notify]);

  return <ToastContext.Provider value={value}>
    {children}
    <div className="toast-region" role="status" aria-live="polite">
      {toast && <div key={toast.id} className={`toast ${toast.error ? "error" : ""}`} role={toast.error ? "alert" : undefined}>
        {toast.error ? <icons.alert /> : <icons.circleCheck />}
        <span>{toast.text}</span>
        <button type="button" className="toast-close" aria-label="Cerrar aviso" onClick={() => setToast(null)}>×</button>
      </div>}
    </div>
  </ToastContext.Provider>;
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast debe usarse dentro de <ToastProvider>.");
  return api;
}
