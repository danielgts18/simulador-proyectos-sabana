/* =========================================================================
   Modal de formulario · overlay + panel con encabezado, cuerpo y acciones
   ========================================================================= */
import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";

interface ModalProps {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;   // cuerpo del formulario
  footer: ReactNode;     // botones de acción
  /** Mientras se envía: bloquea el cierre (×/Escape) y desactiva todos los controles para evitar dobles envíos. */
  submitting?: boolean;
}

export function Modal({ title, eyebrow, onClose, onSubmit, children, footer, submitting = false }: ModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  // Refs para que re-renders del padre (p. ej. un toast) no vuelvan a mover el foco ni re-registren listeners.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const submittingRef = useRef(submitting);
  submittingRef.current = submitting;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submittingRef.current) onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Enfoca una sola vez al abrir: el campo marcado con data-autofocus o, si no hay, el primer control.
    const timer = window.setTimeout(() => {
      const form = formRef.current;
      (form?.querySelector<HTMLElement>("[data-autofocus]")
        ?? form?.querySelector<HTMLElement>("input:not([readonly]), select, textarea, button[type=submit]"))?.focus();
    }, 40);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      window.clearTimeout(timer);
      // Devuelve el foco al control que abrió el modal.
      previouslyFocused?.focus?.();
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (submittingRef.current) { event.preventDefault(); return; }
    onSubmit(event);
  };

  // No cerramos al hacer clic fuera del panel: evita perder datos del formulario
  // por un clic accidental. El cierre es explícito (botón ×, Cancelar o Escape).
  return <div className="modal-backdrop">
    <form ref={formRef} className="modal" onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={submitting}>
      <div className="modal-head">
        <div>
          {eyebrow && <p className="modal-eyebrow">{eyebrow}</p>}
          <h2 id={titleId}>{title}</h2>
        </div>
        <button type="button" className="icon-close" aria-label="Cerrar" onClick={onClose} disabled={submitting}>×</button>
      </div>
      <fieldset className="modal-fieldset" disabled={submitting}>
        {children}
        <div className="modal-actions">{footer}</div>
      </fieldset>
    </form>
  </div>;
}

/* ---- Confirmación de acciones (reemplaza window.confirm) ---------------- */
interface ConfirmModalProps {
  title: string;
  eyebrow?: string;
  message: ReactNode;
  confirmLabel: string;
  /** Acción destructiva: botón rojo. */
  danger?: boolean;
  submitting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({ title, eyebrow, message, confirmLabel, danger = false, submitting = false, onConfirm, onClose }: ConfirmModalProps) {
  return <Modal
    title={title}
    eyebrow={eyebrow}
    onClose={onClose}
    submitting={submitting}
    onSubmit={(e) => { e.preventDefault(); onConfirm(); }}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button type="submit" className={`button ${danger ? "danger" : ""}`}>{submitting ? "Guardando…" : confirmLabel}</button>
    </>}
  >
    <div className="modal-message">{message}</div>
  </Modal>;
}
