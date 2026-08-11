/* =========================================================================
   Vista: Detalle de proyecto (información + vigencias)
   ========================================================================= */
import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/store/store";
import { useToast } from "@/components/Toast";
import { icons } from "@/components/icons";
import { Badge, OverFlag, CycleBudgetBar } from "@/components/ui";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";
import { NewCycleModal } from "@/features/cycles/NewCycleModal";
import { money, formatDate } from "@/lib/format";
import { expenseTotals, cycleFlow } from "@/lib/calculations";

export function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const { getProject, accessibleProjects, canManagePortfolio, deleteProject } = useStore();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [newCycle, setNewCycle] = useState(false);

  const project = getProject(Number(projectId));
  if (!project || !accessibleProjects().includes(project)) return <Navigate to="/projects" replace />;

  const onDelete = () => {
    if (window.confirm(`Eliminar "${project.name}" borrará sus ${project.cycles.length} vigencia(s) y todos sus gastos. Esta acción no se puede deshacer. ¿Continuar?`)) {
      const ecosystem = project.ecosystem;
      deleteProject(project.id);
      notify("Proyecto eliminado.");
      navigate(`/projects/cell/${encodeURIComponent(ecosystem)}`);
    }
  };

  const cycles = [...project.cycles].sort((a, b) => b.year - a.year);

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
          <span className="hero-tag"><icons.user /> {project.leader}</span>
          <span className="hero-tag"><icons.calendar /> {formatDate(project.start)} — {formatDate(project.end)}</span>
        </div>
      </div>
      {canManagePortfolio && <div className="hero-actions">
        <button className="button on-dark" onClick={() => setEditing(true)}><icons.pencil /> Corregir</button>
        <button className="button ghost-on-dark" onClick={onDelete}><icons.trash /> Eliminar</button>
      </div>}
    </div>

    <section className="panel">
      <div className="panel-head">
        <h2><icons.layers /> Vigencias presupuestales</h2>
        {canManagePortfolio && <button className="button sm" onClick={() => setNewCycle(true)}><icons.plus /> Nueva vigencia</button>}
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
  </>;
}
