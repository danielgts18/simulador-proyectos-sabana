/* =========================================================================
   Modal: iniciar nueva vigencia
   ========================================================================= */
import { type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { InfoBox } from "@/components/ui";
import { useStore } from "@/store/store";
import { useToast } from "@/components/Toast";

export function NewCycleModal({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const { createCycle } = useStore();
  const { notify } = useToast();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const result = createCycle(projectId, Number(data.year), (data.notes ?? "").trim());
    if (!result.ok) { notify(result.message ?? "No fue posible crear la vigencia.", true); return; }
    onClose();
    notify(result.message ?? "Vigencia creada.");
  };

  return <Modal
    title="Iniciar nueva vigencia"
    eyebrow="Vigencia presupuestal"
    onClose={onClose}
    onSubmit={onSubmit}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button" type="submit">Crear vigencia</button>
    </>}
  >
    <div style={{ marginBottom: 18 }}><InfoBox cream>La nueva vigencia iniciará en borrador y no modificará los ciclos anteriores. No puede repetirse un año ya registrado.</InfoBox></div>
    <div className="form-grid">
      <label>Año<input className="field" type="number" name="year" min={2025} max={2035} defaultValue={2027} required /></label>
    </div>
    <label className="wide" style={{ marginTop: 16 }}>Observaciones<textarea className="field" name="notes" /></label>
  </Modal>;
}
