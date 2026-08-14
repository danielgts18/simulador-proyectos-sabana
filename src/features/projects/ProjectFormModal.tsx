/* =========================================================================
   Modal: crear / corregir proyecto
   ========================================================================= */
import { type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/Modal";
import { InfoBox } from "@/components/ui";
import { useStore, type Project } from "@/store/apiStore";
import { useToast } from "@/components/Toast";
import { growthHorizons } from "@/lib/format";

interface Props {
  project?: Project | null;
  presetCell?: string | null;
  onClose: () => void;
}

export function ProjectFormModal({ project, presetCell, onClose }: Props) {
  const { users, ecosystems, selectedYear, createProject, updateProject } = useStore();
  const { notify } = useToast();
  const navigate = useNavigate();

  const leaders = users.filter((u) => u.active && u.role === "LIDER_PROYECTO");
  const selectedCell = project?.ecosystem ?? presetCell ?? ecosystems[0];
  const defaultYear = Number(selectedYear) || new Date().getFullYear();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const leader = users.find((u) => u.id === data.leaderUserId);
    const payload = {
      name: data.name.trim(),
      gl: data.gl.trim(),
      ecosystem: data.ecosystem,
      leaderUserId: data.leaderUserId,
      leaderName: leader?.name ?? "",
      objective: data.objective.trim(),
      start: data.start,
      end: data.end,
      description: data.description.trim(),
      notes: (data.notes ?? "").trim(),
      growthHorizon: data.growthHorizon,
    };
    if (project) {
      const result = await updateProject(project.id, payload);
      onClose();
      if (result.ok) notify("Información del proyecto actualizada.");
      else notify(result.message ?? "No fue posible actualizar el proyecto.", true);
    } else {
      const year = Number(data.year) || defaultYear;
      const result = await createProject(payload, year);
      onClose();
      if (result.ok && result.projectId && result.cycleId) {
        notify(`Proyecto creado con la vigencia ${year} en borrador.`);
        navigate(`/projects/${result.projectId}/cycles/${result.cycleId}`);
      } else if (!result.ok) {
        notify(result.message ?? "No fue posible crear el proyecto.", true);
      }
    }
  };

  return <Modal
    title={project ? "Corregir proyecto" : "Crear proyecto"}
    eyebrow={project ? "Portafolio · Proyecto" : "Portafolio · Nuevo registro"}
    onClose={onClose}
    onSubmit={(e) => { void onSubmit(e); }}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button" type="submit">{project ? "Guardar correcciones" : "Crear proyecto y abrir vigencia"}</button>
    </>}
  >
    <div className="form-grid">
      <label className="wide">Nombre del proyecto<input className="field" name="name" required defaultValue={project?.name ?? ""} /></label>
      <label>GL<input className="field" name="gl" required defaultValue={project?.gl ?? ""} /></label>
      <label>Ecosistema / célula
        <select className="field" name="ecosystem" required defaultValue={selectedCell}>
          {ecosystems.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>Líder
        <select className="field" name="leaderUserId" required defaultValue={project?.leaderUserId ?? leaders[0]?.id}>
          {leaders.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </label>
      <label>Horizonte de crecimiento
        <select className="field" name="growthHorizon" required defaultValue={project?.growthHorizon || growthHorizons[0].value}>
          {growthHorizons.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
        </select>
      </label>
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
