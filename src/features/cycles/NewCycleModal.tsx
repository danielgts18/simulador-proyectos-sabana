/* =========================================================================
   Modal: crear vigencia
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { InfoBox } from "@/components/ui";
import { useStore } from "@/store/apiStore";
import { useToast } from "@/components/Toast";

import { FIRST_YEAR } from "@/lib/format";
export function NewCycleModal({ projectId, projectName, existingYears, onClose }: { projectId: number; projectName: string; existingYears: number[]; onClose: () => void }) {
  const { createCycle } = useStore();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);
  const [yearError, setYearError] = useState<string | null>(null);
  // Propone el año siguiente a la última vigencia registrada (o el año actual si no hay ninguna).
  const currentYear = new Date().getFullYear();
  const defaultYear = existingYears.length > 0 ? Math.max(...existingYears) + 1 : currentYear;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const year = Number(data.year);
    if (existingYears.includes(year)) { setYearError(`El proyecto ya tiene la vigencia ${year}.`); return; }
    setSaving(true);
    const result = await createCycle(projectId, year, (data.notes ?? "").trim());
    setSaving(false);
    if (!result.ok) { notify(result.message ?? "No fue posible crear la vigencia.", true); return; }
    onClose();
    notify(`Vigencia ${year} creada en borrador.`);
  };

  return <Modal
    title="Crear vigencia"
    eyebrow={projectName}
    onClose={onClose}
    submitting={saving}
    onSubmit={(e) => { void onSubmit(e); }}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button" type="submit">{saving ? "Guardando…" : "Crear vigencia"}</button>
    </>}
  >
    <div className="modal-intro"><InfoBox cream>La nueva vigencia iniciará en borrador y no modificará las anteriores. No puede repetirse un año ya registrado.</InfoBox></div>
    <div className="form-grid">
      <label>Año<input className="field" type="number" name="year" min={FIRST_YEAR} max={currentYear + 10} defaultValue={defaultYear} required aria-invalid={!!yearError} aria-describedby={yearError ? "year-error" : undefined} onChange={() => setYearError(null)} />
        {yearError && <span id="year-error" className="field-error">{yearError}</span>}
      </label>
      <label className="wide"><span>Observaciones <span className="opt">(opcional)</span></span><textarea className="field" name="notes" /></label>
    </div>
  </Modal>;
}
