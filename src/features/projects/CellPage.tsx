/* =========================================================================
   Vista: Célula (proyectos de un ecosistema)
   ========================================================================= */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/store/apiStore";
import { icons } from "@/components/icons";
import { Metric, ExecCell, Badge, OverFlag, EmptyRow } from "@/components/ui";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";
import { money } from "@/lib/format";
import { cellSummary, projectSnapshot } from "@/lib/calculations";

export function CellPage() {
  const { cell = "" } = useParams();
  const name = decodeURIComponent(cell);
  const { selectedYear, accessibleProjects, canManageProjects } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const projects = accessibleProjects().filter((p) => p.ecosystem === name);
  const summary = cellSummary(name, projects, selectedYear);
  const term = search.trim().toLowerCase();
  const rows = projects.filter((p) => !term || `${p.name} ${p.leader}`.toLowerCase().includes(term));

  return <>
    <div className="page-head">
      <div className="titles"><button className="button subtle" onClick={() => navigate("/projects")}><icons.arrowLeft /> Células</button></div>
      {canManageProjects && <button className="button" onClick={() => setCreating(true)}><icons.plus /> Crear proyecto en {name}</button>}
    </div>

    <div className="detail-hero">
      <div className="hero-body">
        <div className="eyebrow">Célula / ecosistema</div>
        <h1>{name}</h1>
        <p className="subtitle">Portafolio de la célula en la vigencia {selectedYear}.</p>
        <div className="hero-tags">
          <span className="hero-tag"><icons.folder /> {summary.count} proyecto{summary.count === 1 ? "" : "s"}</span>
          <span className="hero-tag"><icons.layers /> {summary.activeCycles} vigencia{summary.activeCycles === 1 ? "" : "s"} abierta{summary.activeCycles === 1 ? "" : "s"}</span>
          {summary.over > 0 && <span className="hero-tag"><icons.alert /> {summary.over} sobreejecutado{summary.over === 1 ? "" : "s"}</span>}
        </div>
      </div>
    </div>

    <div className="metrics m4">
      <Metric label="Presupuesto asignado" value={money(summary.budget)} icon="wallet2" />
      <Metric label="Comprometido" value={money(summary.committed)} icon="clock" tone="tone-exec" />
      <Metric label="Ejecutado" value={money(summary.executed)} icon="coins" tone="tone-exec" />
      <Metric label="Saldo disponible" value={money(summary.available)} icon="wallet" tone={summary.available < 0 ? "tone-alert" : "tone-avail"} />
    </div>

    <section className="panel">
      <div className="panel-head">
        <h2>Proyectos de {name}</h2>
        <div className="filters" style={{ margin: 0 }}>
          <div className="filter-search"><icons.search /><input type="search" placeholder="Buscar proyecto o líder" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table-portfolio">
          <thead><tr><th>Proyecto</th><th>GL</th><th>Presupuesto / Ejecución</th></tr></thead>
          <tbody>
            {rows.length === 0
              ? <EmptyRow colSpan={3}>Esta célula aún no tiene proyectos que coincidan.</EmptyRow>
              : rows.map((project) => {
                const snap = projectSnapshot(project, selectedYear);
                const status = snap.cycle ? snap.cycle.status : "Sin vigencia";
                return <tr key={project.id} className={snap.isOver ? "danger-row" : ""}>
                  <td>
                    <div className="cell-project">
                      <button className="project-link" onClick={() => navigate(`/projects/${project.id}`)}>{project.name}</button>
                      <div className="cell-meta">{snap.cycle ? (snap.isOver ? <OverFlag /> : <Badge value={status} />) : <span className="meta-eco">Sin vigencia</span>}<span className="dot-sep" /><span className="meta-eco">{project.leader}</span></div>
                    </div>
                  </td>
                  <td data-label="GL">{project.gl ? <span className="money">{project.gl}</span> : <span className="exec-empty">—</span>}</td>
                  <td className="exec-cell" data-label="Ejecución">{snap.budget ? <ExecCell budget={snap.budget} totals={{ committed: snap.committed, executed: snap.executed, used: snap.used, available: snap.available }} /> : <span className="exec-empty">Sin presupuesto asignado</span>}</td>
                </tr>;
              })}
          </tbody>
        </table>
      </div>
    </section>

    {creating && <ProjectFormModal presetCell={name} onClose={() => setCreating(false)} />}
  </>;
}
