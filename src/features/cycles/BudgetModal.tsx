/* =========================================================================
   Modal: asignar presupuesto (inicia la vigencia si aún no lo estaba)
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { BudgetSplitFields } from "@/features/cycles/BudgetSplitFields";
import { InfoBox } from "@/components/ui";
import { useStore, type Cycle } from "@/store/apiStore";
import { useToast } from "@/components/Toast";

export function BudgetModal({ projectId, projectName, cycle, onClose }: { projectId: number; projectName: string; cycle: Cycle; onClose: () => void }) {
  const { assignBudget } = useStore();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Vigencia ya presupuestada (datos migrados) sin distribución: solo se reparte el total existente.
  const completing = cycle.budget > 0;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const budgetProviders = Number(data.budgetProviders);
    const budgetHr = Number(data.budgetHr);
    if (!(budgetProviders + budgetHr > 0)) { setError("Distribuye un presupuesto mayor que cero entre Proveedores y Recurso humano."); return; }
    if (completing && budgetProviders + budgetHr !== cycle.budget) { setError("La suma de ambas bolsas debe ser igual al presupuesto de la vigencia."); return; }
    setSaving(true);
    const result = await assignBudget(projectId, cycle.id, { budgetProviders, budgetHr });
    setSaving(false);
    if (!result.ok) { notify(result.message ?? "No fue posible asignar el presupuesto.", true); return; }
    onClose();
    notify(completing ? "Presupuesto distribuido." : "Presupuesto asignado.");
  };

  return <Modal
    title={completing ? "Distribuir presupuesto" : "Asignar presupuesto"}
    eyebrow={`Vigencia ${cycle.year} · ${projectName}`}
    onClose={onClose}
    submitting={saving}
    onSubmit={(e) => { void onSubmit(e); }}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button" type="submit">{saving ? "Guardando…" : completing ? "Guardar distribución" : "Asignar presupuesto"}</button>
    </>}
  >
    <div className="modal-intro"><InfoBox cream>{completing
      ? <>Esta vigencia ya tiene presupuesto. Indica cuánto es para Proveedores y cuánto para Recurso humano; la suma debe coincidir con el total y no podrá modificarse después.</>
      : <>Indica cuánto es para Proveedores y cuánto para Recurso humano. El presupuesto total es la suma y se registra una sola vez.</>}</InfoBox></div>
    <div className="form-grid">
      <BudgetSplitFields fixedTotal={completing ? cycle.budget : undefined} error={error} onChange={() => setError(null)} />
    </div>
  </Modal>;
}
