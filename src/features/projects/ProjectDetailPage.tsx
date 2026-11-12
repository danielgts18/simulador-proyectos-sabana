/* =========================================================================
   Vista: Detalle de proyecto (información + vigencias)
   ========================================================================= */
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/store/apiStore";
import { useToast } from "@/components/Toast";
import { icons } from "@/components/icons";
import { Badge, OverFlag, CycleBudgetBar } from "@/components/ui";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";
import { NewCycleModal } from "@/features/cycles/NewCycleModal";
import { ProgressModal } from "@/features/cycles/ProgressModal";
import { money, formatDate, growthHorizonLabel } from "@/lib/format";
import { expenseTotals, cycleFlow } from "@/lib/calculations";

export function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const { getProject, fetchProjectDetail, accessibleProjects, activeUser, canManageProjects, deleteProject } = useStore();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [newCycle, setNewCycle] = useState(false);
  const [updatingImplementation, setUpdatingImplementation] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [detailFailed, setDetailFailed] = useState(false);

  const id = Number(projectId);

  useEffect(() => {
    setLoaded(false);
    setDetailFailed(false);
    void fetchProjectDetail(id)
      .then((result) => { if (!result) setDetailFailed(true); })
      .finally(() => setLoaded(true));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const project = getProject(id);
  // Guarda por id (no por referencia) para no expulsar la vista tras una mutación.
  // Si el fetch falló (error de red), no redirigimos para no perder el contexto.
  if (loaded && !detailFailed && (!project || !accessibleProjects().some((p) => p.id === id))) return <Navigate to="/projects" replace />;
  if (!loaded && !project) return null;

  const onDelete = async () => {
    if (!project) return;
    if (window.confirm(`Eliminar "${project.name}" borrará sus ${project.cycles.length} vigencia(s) y todos sus gastos. Esta acción no se puede deshacer. ¿Continuar?`)) {
      const ecosystem = project.ecosystem;
      await deleteProject(project.id);
      notify("Proyecto eliminado.");
      navigate(`/projects/cell/${encodeURIComponent(ecosystem)}`);
    }
  };

  if (!project) return null;
  const cycles = [...project.cycles].sort((a, b) => b.year - a.year);
  const canUpdateImplementation = canManageProjects || (activeUser?.role === "LIDER_PROYECTO" && activeUser.id === project.leaderUserId);

  return <>
    <div className="page-head">
      <div className="titles"><button className="button subtle" onClick={() => navigate(`/projects/cell/${encodeURIComponent(project.ecosystem)}`)}><icons.arrowLeft /> {project.ecosystem}</button></div>
    </div>

    <div className="detail-hero">
      <div className="hero-body">
        <div className="eyebrow">{project.ecosystem}</div>
        <h1>{project.name}</h1>
        <p className="subtitle">{project.objective}</p>
        <div className="hero-tags">
          {project.gl && <span className="hero-tag"><icons.tags /> GL {project.gl}</span>}
          <span className="hero-tag"><icons.user /> {project.leader}</span>
          <span className="hero-tag"><icons.calendar /> {formatDate(project.start ?? "")} — {formatDate(project.end ?? "")}</span>
          {project.growthHorizon && <span className="hero-tag"><icons.layers /> {growthHorizonLabel(project.growthHorizon)}</span>}
        </div>
      </div>
      {canManageProjects && <div className="hero-actions">
        <button className="button on-dark" onClick={() => setEditing(true)}><icons.pencil /> Corregir</button>
        <button className="button ghost-on-dark" onClick={() => { void onDelete(); }}><icons.trash /> Eliminar</button>
      </div>}
    </div>

    <section className="panel">
      <div className="panel-head">
        <h2>Avance de implementación</h2>
        <div className="panel-head-actions">
          <span className="help">{project.implementationProgressPct}% completado</span>
          {canUpdateImplementation && <button className="button sm" onClick={() => setUpdatingImplementation(true)}><icons.pencil /> Actualizar avance</button>}
        </div>
      </div>
      <div style={{ height: 12, borderRadius: 999, background: "var(--work, #f0f4fa)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, project.implementationProgressPct))}%`, background: "var(--primary, #0548b8)", borderRadius: 999, transition: "width .3s ease" }} />
      </div>
    </section>

    <section className="panel">
      <div className="panel-head">
        <h2><icons.layers /> Vigencias presupuestales</h2>
        {canManageProjects && <button className="button sm" onClick={() => setNewCycle(true)}><icons.plus /> Nueva vigencia</button>}
      </div>
      <div className="cycle-list">
        {cycles.length === 0
          ? <div className="empty-cycles"><icons.inbox /><p>Aún no hay vigencias.</p><span className="help">Inicia la primera con el botón «Nueva vigencia».</span></div>
          : cycles.map((cycle) => {
            const values = expenseTotals(cycle);
            const isOver = values.available < 0;
            const flow = cycleFlow(cycle);
            const cls = cycle.closed ? "closed" : isOver ? "over" : cycle.status === "Iniciado" ? "started" : "";
            const ctaLabel = cycle.closed ? "Ver vigencia" : flow.next ? flow.next.label : "Abrir vigencia";
            return <article key={cycle.id} className={`cycle-card ${cls}`}>
              <div className="cycle-card-head">
                <h3>Vigencia {cycle.year} <Badge value={cycle.status} /></h3>
                {isOver && <OverFlag />}
              </div>
              <div className="cycle-card-grid">
                <div className="cycle-stat"><div className="k">Presupuesto</div><div className="v">{money(cycle.budget || 0)}</div></div>
                <div className="cycle-stat"><div className="k">Ejecutado</div><div className="v">{money(values.executed)}</div></div>
                <div className="cycle-stat"><div className="k">Saldo</div><div className={`v ${isOver ? "neg" : ""}`}>{money(values.available)}</div></div>
              </div>
              {cycle.budget
                ? <CycleBudgetBar cycle={cycle} />
                : <p className="help">{flow.next ? `Siguiente paso: ${flow.next.title.toLowerCase()}.` : "Vigencia sin presupuesto asignado."}</p>}
              <div className="cycle-card-foot"><button className={`button ${cycle.closed ? "secondary" : ""} sm`} onClick={() => navigate(`/projects/${project.id}/cycles/${cycle.id}`)}>{ctaLabel} →</button></div>
            </article>;
          })}
      </div>
    </section>

    {editing && <ProjectFormModal project={project} onClose={() => setEditing(false)} />}
    {newCycle && <NewCycleModal projectId={project.id} onClose={() => setNewCycle(false)} />}
    {updatingImplementation && <ProgressModal project={project} onClose={() => setUpdatingImplementation(false)} />}
  </>;
}
