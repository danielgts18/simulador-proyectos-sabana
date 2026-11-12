/* =========================================================================
   Modal: asignar presupuesto (inicia la vigencia si aún no lo estaba)
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { InfoBox } from "@/components/ui";
import { useStore, type Cycle } from "@/store/apiStore";
import { useToast } from "@/components/Toast";

export function BudgetModal({ projectId, cycle, onClose }: { projectId: number; cycle: Cycle; onClose: () => void }) {
  const { assignBudget } = useStore();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const budget = Number(data.budget);
    if (!(budget > 0)) { notify("El presupuesto debe ser mayor que cero.", true); return; }
    setSaving(true);
    const result = await assignBudget(projectId, cycle.id, budget);
    setSaving(false);
    if (!result.ok) { notify(result.message ?? "No fue posible asignar el presupuesto.", true); return; }
    onClose();
    notify("Presupuesto asignado y bloqueado para edición.");
  };

  return <Modal
    title="Asignar presupuesto"
    eyebrow={`Vigencia ${cycle.year}`}
    onClose={onClose}
    submitting={saving}
    onSubmit={(e) => { void onSubmit(e); }}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button" type="submit">{saving ? "Guardando…" : "Asignar presupuesto"}</button>
    </>}
  >
    <div className="stack-bottom"><InfoBox cream>El presupuesto anual se registra una sola vez y no podrá modificarse después.</InfoBox></div>
    <div className="form-grid">
      <label className="wide">Valor total (COP)<input className="field" name="budget" type="number" min={1} required placeholder="0" /></label>
    </div>
  </Modal>;
}
