/* =========================================================================
   Toasts efímeros · notificaciones de acción (éxito / error)
   ========================================================================= */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
    timer.current = setTimeout(() => setToast(null), 3600);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [toast]);

  return <ToastContext.Provider value={{ notify }}>
    {children}
    {toast && <div className={`toast ${toast.error ? "error" : ""}`} role="status">
      {toast.error ? <icons.alert /> : <icons.circleCheck />}
      <span>{toast.text}</span>
    </div>}
  </ToastContext.Provider>;
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast debe usarse dentro de <ToastProvider>.");
  return api;
}
