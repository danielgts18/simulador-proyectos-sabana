/* =========================================================================
   Modal: crear / corregir proyecto
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/Modal";
import { InfoBox } from "@/components/ui";
import { useStore, type Project } from "@/store/apiStore";
import { useToast } from "@/components/Toast";
import { growthHorizons, FIRST_YEAR } from "@/lib/format";

interface Props {
  project?: Project | null;
  presetCell?: string | null;
  onClose: () => void;
}

export function ProjectFormModal({ project, presetCell, onClose }: Props) {
  const { users, ecosystems, selectedYear, createProject, updateProject } = useStore();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  const leaders = users.filter((u) => u.active && u.role === "LIDER_PROYECTO");
  // Al corregir, el líder o la célula actuales pueden estar inactivos: se conservan como opción
  // para que el formulario no los reemplace en silencio por el primero de la lista.
  const currentLeaderMissing = !!project && !leaders.some((u) => u.id === project.leaderUserId);
  const currentCellMissing = !!project && !ecosystems.includes(project.ecosystem);
  const selectedCell = project?.ecosystem ?? presetCell ?? ecosystems[0];
  const currentYear = new Date().getFullYear();
  const defaultYear = Number(selectedYear) || currentYear;
  const noLeaders = leaders.length === 0 && !currentLeaderMissing;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const leader = users.find((u) => u.id === data.leaderUserId);
    const payload = {
      name: data.name.trim(),
      gl: data.gl.trim(),
      ecosystem: data.ecosystem,
      leaderUserId: data.leaderUserId,
      leaderName: leader?.name ?? project?.leader ?? "",
      objective: data.objective.trim(),
      start: data.start,
      end: data.end,
      description: data.description.trim(),
      notes: (data.notes ?? "").trim(),
      growthHorizon: data.growthHorizon,
    };
    if (payload.start && payload.end && payload.end < payload.start) {
      setDateError("La finalización estimada no puede ser anterior al inicio.");
      return;
    }
    setSaving(true);
    if (project) {
      const result = await updateProject(project.id, payload);
      setSaving(false);
      // Ante un error el modal permanece abierto para no perder lo diligenciado.
      if (!result.ok) { notify(result.message ?? "No fue posible actualizar el proyecto.", true); return; }
      onClose();
      notify("Proyecto actualizado.");
    } else {
      const year = Number(data.year) || defaultYear;
      const result = await createProject(payload, year);
      setSaving(false);
      if (!result.ok) { notify(result.message ?? "No fue posible crear el proyecto.", true); return; }
      onClose();
      notify(`Proyecto creado con la vigencia ${year}.`);
      if (result.projectId && result.cycleId) navigate(`/projects/${result.projectId}/cycles/${result.cycleId}`);
    }
  };

  return <Modal
    title={project ? "Corregir proyecto" : "Crear proyecto"}
    eyebrow={project ? `Célula · ${project.ecosystem}` : presetCell ? `Célula · ${presetCell}` : "Células"}
    onClose={onClose}
    submitting={saving}
    onSubmit={(e) => { void onSubmit(e); }}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button" type="submit" disabled={noLeaders}>{saving ? "Guardando…" : project ? "Guardar cambios" : "Crear proyecto"}</button>
    </>}
  >
    {noLeaders
      ? <div className="modal-intro"><InfoBox cream>No hay líderes de proyecto activos. Pide a la Jefatura que cree o active un usuario con rol «Líder de proyecto» antes de continuar.</InfoBox></div>
      : !project && <div className="modal-intro"><InfoBox cream>Al crear el proyecto se abre su primera vigencia en borrador y te llevamos a gestionarla.</InfoBox></div>}
    <div className="form-grid">
      <label className="wide">Nombre del proyecto<input className="field" name="name" required defaultValue={project?.name ?? ""} /></label>
      <label>Código GL<input className="field" name="gl" required defaultValue={project?.gl ?? ""} aria-describedby="gl-help" /><span id="gl-help" className="field-help">Código contable del proyecto.</span></label>
      <label>Célula
        <select className="field" name="ecosystem" required defaultValue={selectedCell}>
          {currentCellMissing && project && <option value={project.ecosystem}>{project.ecosystem} (inactiva)</option>}
          {ecosystems.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>Líder
        <select className="field" name="leaderUserId" required defaultValue={project?.leaderUserId ?? leaders[0]?.id}>
          {currentLeaderMissing && project && <option value={project.leaderUserId}>{project.leader} (actual)</option>}
          {leaders.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </label>
      <label>Horizonte de crecimiento
        <select className="field" name="growthHorizon" required defaultValue={project?.growthHorizon || growthHorizons[0].value}>
          {growthHorizons.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
        </select>
      </label>
      <label className="wide">Objetivo<input className="field" name="objective" required defaultValue={project?.objective ?? ""} /></label>
      {/* El servidor puede devolver fechas con hora ("…T00:00:00Z"); el campo date solo acepta YYYY-MM-DD. */}
      <label>Inicio estimado<input className="field" type="date" name="start" required defaultValue={project?.start?.slice(0, 10) ?? ""} /></label>
      <label>Finalización estimada<input className="field" type="date" name="end" required defaultValue={project?.end?.slice(0, 10) ?? ""} aria-invalid={!!dateError} aria-describedby={dateError ? "end-error" : undefined} onChange={() => setDateError(null)} />
        {dateError && <span id="end-error" className="field-error">{dateError}</span>}
      </label>
      <label className="wide">Descripción<textarea className="field" name="description" required defaultValue={project?.description ?? ""} /></label>
      <label className="wide"><span>Observaciones <span className="opt">(opcional)</span></span><textarea className="field" name="notes" defaultValue={project?.notes ?? ""} /></label>
      {!project && <>
        <label>Año de la primera vigencia<input className="field" type="number" name="year" min={FIRST_YEAR} max={currentYear + 10} defaultValue={defaultYear} required /></label>
      </>}
    </div>
  </Modal>;
}
