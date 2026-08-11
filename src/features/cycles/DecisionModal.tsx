/* =========================================================================
   Modal: registrar decisión de la Subcomisión (aprobación anual)
   ========================================================================= */
import { type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { useStore } from "@/store/store";
import { useToast } from "@/components/Toast";
import type { Cycle } from "@/lib/types";

export function DecisionModal({ projectId, cycle, onClose }: { projectId: number; cycle: Cycle; onClose: () => void }) {
  const { recordDecision } = useStore();
  const { notify } = useToast();
  const today = new Date().toISOString().slice(0, 10);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    recordDecision(projectId, cycle.id, {
      approval: data.approval as "Aprobado" | "Rechazado",
      approvalDate: data.approvalDate,
      act: data.act.trim(),
      notes: data.notes.trim(),
    });
    onClose();
    notify("Decisión de Subcomisión registrada.");
  };

  return <Modal
    title="Registrar decisión de Subcomisión"
    eyebrow={`Aprobación anual · ${cycle.year}`}
    onClose={onClose}
    onSubmit={onSubmit}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button" type="submit">Guardar decisión</button>
    </>}
  >
    <div className="form-grid">
      <label>Resultado<select className="field" name="approval" defaultValue="Aprobado"><option>Aprobado</option><option>Rechazado</option></select></label>
      <label>Fecha<input className="field" name="approvalDate" type="date" defaultValue={today} required /></label>
      <label className="wide">Número de acta<input className="field" name="act" required placeholder="Ej. SC-045-2026" /></label>
      <label className="wide">Observaciones<textarea className="field" name="notes" required /></label>
    </div>
  </Modal>;
}
