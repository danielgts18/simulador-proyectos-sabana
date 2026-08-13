/* =========================================================================
   Modal de formulario · overlay + panel con encabezado, cuerpo y acciones
   ========================================================================= */
import { useEffect, useRef, type FormEvent, type ReactNode } from "react";

interface ModalProps {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;   // cuerpo del formulario
  footer: ReactNode;     // botones de acción
}

export function Modal({ title, eyebrow, onClose, onSubmit, children, footer }: ModalProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    // Enfoca el primer control del formulario.
    const first = formRef.current?.querySelector<HTMLElement>("input, select, textarea");
    const raf = window.setTimeout(() => first?.focus(), 40);
    return () => { document.removeEventListener("keydown", onKey); window.clearTimeout(raf); };
  }, [onClose]);

  // No cerramos al hacer clic fuera del panel: evita perder datos del formulario
  // por un clic accidental. El cierre es explícito (botón ×, Cancelar o Escape).
  return <div className="modal-backdrop">
    <form ref={formRef} className="modal" onSubmit={onSubmit}>
      <div className="modal-head">
        <div>
          {eyebrow && <p className="modal-eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        <button type="button" className="icon-close" aria-label="Cerrar" onClick={onClose}>×</button>
      </div>
      {children}
      <div className="modal-actions">{footer}</div>
    </form>
  </div>;
}
