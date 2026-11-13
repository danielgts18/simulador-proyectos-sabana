/* =========================================================================
   Vista: Célula (proyectos de un ecosistema)
   ========================================================================= */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/store/apiStore";
import { icons } from "@/components/icons";
import { Metric, ExecCell, Badge, OverFlag, EmptyRow, LoadState } from "@/components/ui";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";
import { QuickExpenseButton } from "@/features/expenses/QuickExpenseButton";
import { money } from "@/lib/format";
import { summarizeRows, useYearRows } from "@/features/projects/useYearRows";

export function CellPage() {
  // useParams ya entrega el valor decodificado (decodificar otra vez rompe nombres con "%").
  const { cell: name = "" } = useParams();
  const { selectedYear, accessibleProjects, canManageProjects, canManageExpenses } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const { rows: yearRows, loading: loadingRows, error, retry } = useYearRows(selectedYear);
  const loading = loadingRows || !!error;

  const projects = accessibleProjects().filter((p) => p.ecosystem === name);
  const cellRows = yearRows.filter((r) => r.ecosystem === name);
  const summary = summarizeRows(cellRows);
  const rowByProject = new Map(cellRows.map((r) => [r.projectId, r]));
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
          <span className="hero-tag"><icons.folder /> {projects.length} proyecto{projects.length === 1 ? "" : "s"}</span>
          <span className="hero-tag"><icons.layers /> {summary.activeCycles} vigencia{summary.activeCycles === 1 ? "" : "s"} abierta{summary.activeCycles === 1 ? "" : "s"}</span>
          {summary.over > 0 && <span className="hero-tag"><icons.alert /> {summary.over} sobreejecutado{summary.over === 1 ? "" : "s"}</span>}
        </div>
      </div>
    </div>

    {error && <LoadState error={`No fue posible cargar las cifras de la vigencia ${selectedYear}. ${error}`} onRetry={retry} />}
    <div className="metrics m4">
      <Metric label="Presupuesto asignado" value={loading ? "—" : money(summary.budget)} icon="wallet2" />
      <Metric label="Comprometido" value={loading ? "—" : money(summary.committed)} icon="clock" tone="tone-exec" />
      <Metric label="Ejecutado" value={loading ? "—" : money(summary.executed)} icon="coins" tone="tone-exec" />
      <Metric label="Saldo disponible" value={loading ? "—" : money(summary.available)} icon="wallet" tone={summary.available < 0 ? "tone-alert" : "tone-avail"} />
    </div>

    <section className="panel">
      <div className="panel-head">
        <h2><icons.folder /> Proyectos de {name}</h2>
        <div className="filters">
          <div className="filter-search"><icons.search /><input type="search" placeholder="Buscar proyecto o líder" aria-label="Buscar proyecto o líder" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table-portfolio">
          <thead><tr><th>Proyecto</th><th>GL</th><th>Presupuesto / Ejecución</th></tr></thead>
          <tbody>
            {rows.length === 0
              ? <EmptyRow colSpan={3}>{projects.length === 0 ? "Esta célula aún no tiene proyectos." : "Ningún proyecto coincide con la búsqueda."}</EmptyRow>
              : rows.map((project) => {
                const row = rowByProject.get(project.id);
                const hasCycle = !!row && row.cycleId !== null;
                const snap = { budget: row?.budget ?? 0, committed: row?.committed ?? 0, executed: row?.executed ?? 0, used: (row?.committed ?? 0) + (row?.executed ?? 0), available: row?.available ?? 0, isOver: (row?.available ?? 0) < 0 };
                const status = row?.cycleStatus ?? row?.approvalStatus ?? "Borrador";
                return <tr key={project.id} className={snap.isOver ? "danger-row" : ""}>
                  <td>
                    <div className="cell-project">
                      <button className="project-link" onClick={() => navigate(`/projects/${project.id}`)}>{project.name}</button>
                      <div className="cell-meta">{hasCycle ? (snap.isOver ? <OverFlag /> : <Badge value={status} />) : <span className="meta-eco">Sin vigencia</span>}<span className="dot-sep" /><span className="meta-eco">{project.leader}</span></div>
                    {hasCycle && row && row.cycleId !== null && !row.closed && canManageExpenses(project) &&
                      <div className="row-actions"><QuickExpenseButton projectId={project.id} cycleId={row.cycleId} projectName={project.name} onSaved={retry} /></div>}
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
