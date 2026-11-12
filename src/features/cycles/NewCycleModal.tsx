/* =========================================================================
   Modal: crear vigencia
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { InfoBox } from "@/components/ui";
import { useStore } from "@/store/apiStore";
import { useToast } from "@/components/Toast";

export function NewCycleModal({ projectId, existingYears, onClose }: { projectId: number; existingYears: number[]; onClose: () => void }) {
  const { createCycle } = useStore();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);
  // Propone el año siguiente a la última vigencia registrada (o el año actual si no hay ninguna).
  const currentYear = new Date().getFullYear();
  const defaultYear = existingYears.length > 0 ? Math.max(...existingYears) + 1 : currentYear;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const year = Number(data.year);
    if (existingYears.includes(year)) { notify(`El proyecto ya tiene la vigencia ${year}.`, true); return; }
    setSaving(true);
    const result = await createCycle(projectId, year, (data.notes ?? "").trim());
    setSaving(false);
    if (!result.ok) { notify(result.message ?? "No fue posible crear la vigencia.", true); return; }
    onClose();
    notify(`Vigencia ${year} creada en borrador.`);
  };

  return <Modal
    title="Crear vigencia"
    eyebrow="Vigencia presupuestal"
    onClose={onClose}
    submitting={saving}
    onSubmit={(e) => { void onSubmit(e); }}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button" type="submit">{saving ? "Creando…" : "Crear vigencia"}</button>
    </>}
  >
    <div className="stack-bottom"><InfoBox cream>La nueva vigencia iniciará en borrador y no modificará las anteriores. No puede repetirse un año ya registrado.</InfoBox></div>
    <div className="form-grid">
      <label>Año<input className="field" type="number" name="year" min={currentYear - 2} max={currentYear + 10} defaultValue={defaultYear} required /></label>
      <label className="wide">Observaciones<textarea className="field" name="notes" /></label>
    </div>
  </Modal>;
}
