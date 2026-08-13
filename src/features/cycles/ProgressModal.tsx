/* =========================================================================
   Modal: registrar % de avance de la vigencia
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { InfoBox } from "@/components/ui";
import { useStore, type Cycle } from "@/store/apiStore";
import { useToast } from "@/components/Toast";

interface Props {
  projectId: number;
  cycle: Cycle;
  onClose: () => void;
}

export function ProgressModal({ projectId, cycle, onClose }: Props) {
  const { updateProgress } = useStore();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pct = Number(new FormData(event.currentTarget).get("progressPct"));
    setSaving(true);
    const result = await updateProgress(projectId, cycle.id, pct);
    setSaving(false);
    if (!result.ok) { notify(result.message ?? "No fue posible actualizar el avance.", true); return; }
    onClose();
    notify("Avance de la vigencia actualizado.");
  };

  return <Modal
    title="Actualizar avance"
    eyebrow={`Vigencia ${cycle.year}`}
    onClose={onClose}
    onSubmit={(e) => { void onSubmit(e); }}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar avance"}</button>
    </>}
  >
    <div className="form-grid">
      <label>Porcentaje de avance (%)<input className="field" name="progressPct" type="number" min={0} max={100} step={1} required defaultValue={cycle.progressPct} /></label>
    </div>
    <div style={{ marginTop: 18 }}><InfoBox>Registra el porcentaje de avance de esta vigencia (0 a 100).</InfoBox></div>
  </Modal>;
}
