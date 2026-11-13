/* =========================================================================
   Modal: decisión de la Subcomisión (aprobación anual).
   Al aprobar se asigna el presupuesto en el mismo paso, que inicia la vigencia.
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { InfoBox } from "@/components/ui";
import { useStore, type Cycle } from "@/store/apiStore";
import { useToast } from "@/components/Toast";
import { localDateISO } from "@/lib/format";

export function DecisionModal({ projectId, cycle, onClose }: { projectId: number; cycle: Cycle; onClose: () => void }) {
  const { recordDecision } = useStore();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);
  const [approval, setApproval] = useState<"Aprobado" | "Rechazado">("Aprobado");
  const today = localDateISO();
  // Si la vigencia ya traía presupuesto (datos anteriores), no se vuelve a pedir.
  const needsBudget = approval === "Aprobado" && !(cycle.budget > 0);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const budget = Number(data.budget);
    if (needsBudget && !(budget > 0)) { notify("El presupuesto debe ser mayor que cero.", true); return; }
    setSaving(true);
    const result = await recordDecision(projectId, cycle.id, {
      approval,
      approvalDate: data.approvalDate,
      act: data.act.trim(),
      notes: (data.notes ?? "").trim(),
      ...(needsBudget ? { budget } : {}),
    });
    setSaving(false);
    if (!result.ok) { notify(result.message ?? "No fue posible registrar la decisión.", true); return; }
    onClose();
    notify(needsBudget ? "Vigencia aprobada, presupuesto asignado e iniciada." : "Decisión de Subcomisión registrada.");
  };

  return <Modal
    title="Aprobar vigencia"
    eyebrow={`Aprobación anual · ${cycle.year}`}
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
      <label className="wide">Número de acta<input className="field" name="act" required autoFocus placeholder="Ej. SC-045-2026" /></label>
      {needsBudget && <label className="wide">Presupuesto anual (COP)<input className="field" name="budget" type="number" min={1} required placeholder="0" /></label>}
      <label className="wide">Observaciones (opcional)<textarea className="field" name="notes" /></label>
    </div>
    {needsBudget && <div className="stack-top"><InfoBox cream>El presupuesto se registra una sola vez y no podrá modificarse después.</InfoBox></div>}
  </Modal>;
}
