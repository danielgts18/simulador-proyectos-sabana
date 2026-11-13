/* =========================================================================
   Modal: decisión de la Subcomisión (aprobación anual).
   Al aprobar se asigna el presupuesto en el mismo paso, que inicia la vigencia.
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { BudgetSplitFields } from "@/features/cycles/BudgetSplitFields";
import { useStore, type Cycle } from "@/store/apiStore";
import { useToast } from "@/components/Toast";
import { localDateISO } from "@/lib/format";

export function DecisionModal({ projectId, projectName, cycle, onClose }: { projectId: number; projectName: string; cycle: Cycle; onClose: () => void }) {
  const { recordDecision } = useStore();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [approval, setApproval] = useState<"Aprobado" | "Rechazado">("Aprobado");
  const today = localDateISO();
  // Si la vigencia ya traía presupuesto (datos anteriores), no se vuelve a pedir.
  const needsBudget = approval === "Aprobado" && !(cycle.budget > 0);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const budgetProviders = Number(data.budgetProviders);
    const budgetHr = Number(data.budgetHr);
    if (needsBudget && !(budgetProviders + budgetHr > 0)) { setBudgetError("Distribuye un presupuesto mayor que cero entre Proveedores y Recurso humano."); return; }
    setSaving(true);
    const result = await recordDecision(projectId, cycle.id, {
      approval,
      approvalDate: data.approvalDate,
      act: data.act.trim(),
      notes: (data.notes ?? "").trim(),
      ...(needsBudget ? { budgetProviders, budgetHr } : {}),
    });
    setSaving(false);
    if (!result.ok) { notify(result.message ?? "No fue posible registrar la decisión.", true); return; }
    onClose();
    notify(needsBudget ? "Vigencia aprobada con presupuesto." : "Decisión registrada.");
  };

  return <Modal
    title="Decisión de la Subcomisión"
    eyebrow={`Vigencia ${cycle.year} · ${projectName}`}
    onClose={onClose}
    submitting={saving}
    onSubmit={(e) => { void onSubmit(e); }}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button" type="submit">{saving ? "Guardando…" : approval === "Aprobado" ? (needsBudget ? "Aprobar y asignar presupuesto" : "Aprobar") : "Registrar rechazo"}</button>
    </>}
  >
    <div className="form-grid">
      <label>Resultado<select className="field" name="approval" value={approval} onChange={(e) => setApproval(e.target.value as "Aprobado" | "Rechazado")}><option>Aprobado</option><option>Rechazado</option></select></label>
      <label>Fecha<input className="field" name="approvalDate" type="date" defaultValue={today} max={today} required /></label>
      <label className="wide">Número de acta<input className="field" name="act" required data-autofocus="" aria-describedby="act-help" />
        <span id="act-help" className="field-help">Ejemplo: SC-045-2026</span></label>
      {needsBudget && <>
        <div className="wide"><span className="label-caps">Presupuesto anual</span><p className="field-help">Indica cuánto es para Proveedores y cuánto para Recurso humano. Se registra una sola vez y no podrá modificarse después.</p></div>
        <BudgetSplitFields error={budgetError} onChange={() => setBudgetError(null)} />
      </>}
      <label className="wide"><span>Observaciones <span className="opt">(opcional)</span></span><textarea className="field" name="notes" /></label>
    </div>
  </Modal>;
}
