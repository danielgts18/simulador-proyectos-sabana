/* =========================================================================
  Modal: registrar % de avance de implementación de una vigencia
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { InfoBox } from "@/components/ui";
import { useStore, type Project, type Cycle } from "@/store/apiStore";
import { useToast } from "@/components/Toast";

interface Props {
  project: Project;
  cycle: Cycle;
  onClose: () => void;
}

export function ProgressModal({ project, cycle, onClose }: Props) {
  const { updateCycleProgress } = useStore();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pct = Number(new FormData(event.currentTarget).get("progressPct"));
    setSaving(true);
    const result = await updateCycleProgress(project.id, cycle.id, pct);
    setSaving(false);
    if (!result.ok) { notify(result.message ?? "No fue posible actualizar el avance.", true); return; }
    onClose();
    notify("Avance de implementación actualizado.");
  };

  return <Modal
    title="Actualizar avance"
    eyebrow={`Vigencia ${cycle.year} · ${project.name}`}
    onClose={onClose}
    submitting={saving}
    onSubmit={(e) => { void onSubmit(e); }}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button" type="submit">{saving ? "Guardando…" : "Guardar cambios"}</button>
    </>}
  >
    <div className="modal-intro"><InfoBox>Registra el avance de implementación de la vigencia {cycle.year}, de 0 a 100 %.</InfoBox></div>
    <div className="form-grid">
      <label>Avance de implementación (%)<input className="field" name="progressPct" type="number" min={0} max={100} step={1} required defaultValue={cycle.progressPct} /></label>
    </div>
  </Modal>;
}
