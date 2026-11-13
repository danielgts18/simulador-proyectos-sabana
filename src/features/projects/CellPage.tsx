/* =========================================================================
   Vista: Célula (proyectos de una célula en la vigencia seleccionada)
   ========================================================================= */
import { useState, type KeyboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/store/apiStore";
import { icons } from "@/components/icons";
import { PageHeader, Tag, Kpi, BudgetBar, Badge, OverFlag, EmptyRow, LoadState, YearSelect } from "@/components/ui";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";
import { QuickExpenseButton } from "@/features/expenses/QuickExpenseButton";
import { moneyShort } from "@/lib/format";
import { summarizeRows, useYearRows } from "@/features/projects/useYearRows";

export function CellPage() {
  // useParams ya entrega el valor decodificado (decodificar otra vez rompe nombres con "%").
  const { cell: name = "" } = useParams();
  const { selectedYear, setSelectedYear, accessibleProjects, canManageProjects, canManageExpenses } = useStore();
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
  const fig = (n: number) => (loading ? "—" : moneyShort(n));

  // Mismo destino que en el dashboard: la vigencia del año seleccionado o, si no existe, el proyecto.
  const open = (projectId: number) => {
    const row = rowByProject.get(projectId);
    navigate(row && row.cycleId !== null ? `/projects/${projectId}/cycles/${row.cycleId}` : `/projects/${projectId}`);
  };
  const onRowKey = (e: KeyboardEvent, projectId: number) => { if (e.key === "Enter") open(projectId); };

  return <>
    <PageHeader
      detail
      eyebrow={`Célula · Vigencia ${selectedYear}`}
      title={name}
      tags={<>
        <Tag icon="folder">{projects.length} proyecto{projects.length === 1 ? "" : "s"}</Tag>
        <Tag icon="layers">{summary.activeCycles} vigencia{summary.activeCycles === 1 ? "" : "s"} abierta{summary.activeCycles === 1 ? "" : "s"}</Tag>
        {summary.over > 0 && <OverFlag />}
      </>}
      actions={<>
        <div className="filters"><YearSelect value={selectedYear} onChange={setSelectedYear} /></div>
        {canManageProjects && <button className="button" onClick={() => setCreating(true)}><icons.plus /> Crear proyecto</button>}
      </>}
    />

    {error && <LoadState error={`No fue posible cargar las cifras de la vigencia ${selectedYear}. ${error}`} onRetry={retry} />}
    <div className="kpis">
      <Kpi label="Presupuesto asignado" value={fig(summary.budget)} icon="wallet2" />
      <Kpi label="Ejecutado" value={fig(summary.executed)} icon="coins" />
      <Kpi label="Comprometido" value={fig(summary.committed)} icon="clock" />
      <Kpi label={summary.available < 0 ? "Sobreejecución" : "Disponible"} value={fig(Math.abs(summary.available))} icon="wallet" tone={summary.available < 0 ? "danger" : "success"} />
    </div>

    <section className="panel">
      <div className="panel-head">
        <h2><icons.folder /> Proyectos</h2>
        <div className="filters">
          <div className="filter-search"><icons.search /><input type="search" placeholder="Buscar proyecto o líder" aria-label="Buscar proyecto o líder" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>
      </div>
      <div className="table-wrap table-cards">
        <table>
          <thead><tr><th>Proyecto</th><th>GL</th><th>Uso del presupuesto</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {rows.length === 0
              ? <EmptyRow colSpan={5} title={projects.length === 0 ? "Aún no hay proyectos en esta célula" : "Ningún proyecto coincide con la búsqueda"} />
              : rows.map((project) => {
                const row = rowByProject.get(project.id);
                const hasCycle = !!row && row.cycleId !== null;
                const isOver = !!row && row.available < 0;
                const status = row?.cycleStatus ?? row?.approvalStatus ?? "Borrador";
                const quick = hasCycle && row && row.cycleId !== null && !row.closed && canManageExpenses(project);
                return <tr key={project.id} className={`is-clickable ${isOver ? "is-over" : ""}`} tabIndex={0} onClick={() => open(project.id)} onKeyDown={(e) => onRowKey(e, project.id)}>
                  <td>
                    <span className="project-link">{project.name}</span>
                    <div className="project-meta">{project.leader}</div>
                  </td>
                  <td data-label="GL">{project.gl || "—"}</td>
                  <td data-label="Uso del presupuesto" className="db-usecell">
                    {row && row.budget ? <BudgetBar budget={row.budget} executed={row.executed} committed={row.committed} meta /> : <span className="muted-note">{hasCycle ? "Sin presupuesto asignado" : `Sin vigencia ${selectedYear}`}</span>}
                  </td>
                  <td data-label="Estado">{hasCycle ? (isOver ? <OverFlag /> : <Badge value={status} />) : <span className="muted-note">—</span>}</td>
                  <td onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    {quick && row && row.cycleId !== null && <QuickExpenseButton projectId={project.id} cycleId={row.cycleId} projectName={project.name} onSaved={retry} />}
                  </td>
                </tr>;
              })}
          </tbody>
        </table>
      </div>
    </section>

    {creating && <ProjectFormModal presetCell={name} onClose={() => setCreating(false)} />}
  </>;
}
