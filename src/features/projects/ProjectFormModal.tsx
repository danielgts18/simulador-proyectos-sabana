/* =========================================================================
   Modal: crear / corregir proyecto
   ========================================================================= */
import { type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/Modal";
import { InfoBox } from "@/components/ui";
import { useStore } from "@/store/store";
import { useToast } from "@/components/Toast";
import type { Project } from "@/lib/types";

interface Props {
  project?: Project | null;   // presente => edición
  presetCell?: string | null; // célula preseleccionada (creación desde una célula)
  onClose: () => void;
}

export function ProjectFormModal({ project, presetCell, onClose }: Props) {
  const { state, createProject, updateProject } = useStore();
  const { notify } = useToast();
  const navigate = useNavigate();

  const leaders = state.users.filter((user) => user.active && user.role === "LIDER_PROYECTO");
  const selectedCell = project?.ecosystem || presetCell || state.ecosystems[0];
  const defaultYear = Number(state.selectedYear) || new Date().getFullYear();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const payload = {
      name: data.name.trim(), ecosystem: data.ecosystem, leaderUserId: Number(data.leaderUserId),
      objective: data.objective.trim(), start: data.start, end: data.end,
      description: data.description.trim(), notes: (data.notes ?? "").trim(),
    };
    if (project) {
      updateProject(project.id, payload);
      onClose();
      notify("Información del proyecto actualizada.");
    } else {
      const year = Number(data.year) || defaultYear;
      const result = createProject(payload, year);
      onClose();
      if (result.ok && result.projectId && result.cycleId) {
        notify(`Proyecto creado con la vigencia ${year} en borrador.`);
        navigate(`/projects/${result.projectId}/cycles/${result.cycleId}`);
      }
    }
  };

  return <Modal
    title={project ? "Corregir proyecto" : "Crear proyecto"}
    eyebrow={project ? "Portafolio · Proyecto" : "Portafolio · Nuevo registro"}
    onClose={onClose}
    onSubmit={onSubmit}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button" type="submit">{project ? "Guardar correcciones" : "Crear proyecto y abrir vigencia"}</button>
    </>}
  >
    <div className="form-grid">
      <label className="wide">Nombre del proyecto<input className="field" name="name" required defaultValue={project?.name ?? ""} /></label>
      <label>Ecosistema / célula<select className="field" name="ecosystem" required defaultValue={selectedCell}>{state.ecosystems.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Líder<select className="field" name="leaderUserId" required defaultValue={project?.leaderUserId ?? leaders[0]?.id}>{leaders.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      <label className="wide">Objetivo<input className="field" name="objective" required defaultValue={project?.objective ?? ""} /></label>
      <label>Inicio estimado<input className="field" type="date" name="start" required defaultValue={project?.start ?? ""} /></label>
      <label>Finalización estimada<input className="field" type="date" name="end" required defaultValue={project?.end ?? ""} /></label>
      <label className="wide">Descripción<textarea className="field" name="description" required defaultValue={project?.description ?? ""} /></label>
      <label className="wide">Observaciones<textarea className="field" name="notes" defaultValue={project?.notes ?? ""} /></label>
      {!project && <>
        <div className="wide"><InfoBox cream>Al crear el proyecto se abrirá su primera vigencia y te llevaremos directamente a gestionarla.</InfoBox></div>
        <label>Año de la primera vigencia<input className="field" type="number" name="year" min={2025} max={2035} defaultValue={defaultYear} required /></label>
      </>}
    </div>
  </Modal>;
}
