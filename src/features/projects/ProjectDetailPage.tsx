/* =========================================================================
   Vista: Detalle de proyecto (información + vigencias)
   ========================================================================= */
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore, type Cycle } from "@/store/apiStore";
import { useToast } from "@/components/Toast";
import { icons } from "@/components/icons";
import { PageHeader, Tag, Badge, OverFlag, CycleBudgetBar, LoadState, ProgressBar, EmptyState } from "@/components/ui";
import { ConfirmModal } from "@/components/Modal";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";
import { NewCycleModal } from "@/features/cycles/NewCycleModal";
import { ProgressModal } from "@/features/cycles/ProgressModal";
import { moneyShort, formatDate, growthHorizonLabel } from "@/lib/format";
import { expenseTotals, cycleFlow } from "@/lib/calculations";

export function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const { getProject, fetchProjectDetail, accessibleProjects, activeUser, isJefatura, canManageProjects, deleteProject } = useStore();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [newCycle, setNewCycle] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState<Cycle | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const id = Number(projectId);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setDetailError(null);
    void fetchProjectDetail(id).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 403 || result.status === 404) {
          notify(result.status === 403 ? "No tienes acceso a este proyecto." : "El proyecto no existe o fue eliminado.", true);
          navigate("/projects", { replace: true });
          return;
        }
        setDetailError(result.message);
      }
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [id, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const project = getProject(id);
  // Guarda por id (no por referencia) para no expulsar la vista tras una mutación.
  if (loaded && !detailError && (!project || !accessibleProjects().some((p) => p.id === id))) return <Navigate to="/projects" replace />;
  // Mientras no haya detalle (vigencias) no se muestra la lista: evitaría un falso "Aún no hay vigencias".
  if (!project || !loaded || detailError) {
    return <LoadState loading={!loaded} error={detailError} onRetry={() => setReloadKey((k) => k + 1)}>Cargando proyecto…</LoadState>;
  }

  const onConfirmDelete = async () => {
    const ecosystem = project.ecosystem;
    setDeleting(true);
    const result = await deleteProject(project.id);
    setDeleting(false);
    if (!result.ok) { notify(result.message ?? "No fue posible eliminar el proyecto.", true); return; }
    notify("Proyecto eliminado.");
    navigate(`/projects/cell/${encodeURIComponent(ecosystem)}`);
  };
  const cycles = [...project.cycles].sort((a, b) => b.year - a.year);
  const canUpdateImplementation = canManageProjects || (activeUser?.role === "LIDER_PROYECTO" && activeUser.id === project.leaderUserId);

  return <>
    <PageHeader
      detail
      eyebrow={`Célula · ${project.ecosystem}`}
      title={project.name}
      subtitle={project.objective}
      tags={<>
        <Tag icon="user">{project.leader}</Tag>
        {project.gl && <Tag icon="tags">GL {project.gl}</Tag>}
        <Tag icon="calendar">{formatDate(project.start ?? "")} — {formatDate(project.end ?? "")}</Tag>
        {project.growthHorizon && <Tag icon="layers">{growthHorizonLabel(project.growthHorizon)}</Tag>}
      </>}
      actions={canManageProjects && <>
        <button className="button secondary" onClick={() => setEditing(true)}><icons.pencil /> Corregir</button>
        <button className="button ghost-danger" onClick={() => setConfirmDelete(true)}><icons.trash /> Eliminar</button>
      </>}
    />

    <section className="panel">
      <div className="panel-head">
        <h2><icons.layers /> Vigencias presupuestales</h2>
        {canManageProjects && <button className="button sm" onClick={() => setNewCycle(true)}><icons.plus /> Crear vigencia</button>}
      </div>
      {cycles.length === 0
        ? <EmptyState title="Aún no hay vigencias" action={canManageProjects && <button className="button" onClick={() => setNewCycle(true)}><icons.plus /> Crear vigencia</button>}>
          {canManageProjects ? "Crea la primera vigencia para asignar presupuesto y registrar gastos." : "El gestor financiero creará la primera vigencia."}
        </EmptyState>
        : <div className="cycle-list">
          {cycles.map((cycle) => {
            const values = expenseTotals(cycle);
            const isOver = values.available < 0;
            const flow = cycleFlow(cycle);
            const cls = cycle.closed ? "closed" : isOver ? "is-over" : cycle.status === "Iniciado" ? "started" : "";
            // El botón solo navega: se etiqueta como acción solo si este rol puede ejecutar el siguiente paso.
            const nextAction = flow.next?.action;
            const canActNext = nextAction === "new-expense" ? true
              : nextAction === "submit-review" ? canManageProjects
                : nextAction ? (isJefatura || canManageProjects) : false;
            const ctaLabel = cycle.closed ? "Ver vigencia" : flow.next && canActNext ? flow.next.label : "Abrir vigencia";
            return <article key={cycle.id} className={`cycle-card ${cls}`}>
              <div className="cycle-card-head">
                <h3>Vigencia {cycle.year} <Badge value={cycle.status} /></h3>
                {isOver && <OverFlag />}
              </div>
              <div className="stats">
                <div className="stat"><span className="k">Presupuesto</span><span className="v">{moneyShort(cycle.budget || 0)}</span></div>
                <div className="stat"><span className="k">Ejecutado</span><span className="v">{moneyShort(values.executed)}</span></div>
                <div className="stat"><span className="k">{isOver ? "Sobreejecución" : "Disponible"}</span><span className={`v ${isOver ? "neg" : ""}`}>{moneyShort(Math.abs(values.available))}</span></div>
              </div>
              {cycle.budget
                ? <CycleBudgetBar cycle={cycle} />
                : <p className="help">{flow.next ? `Siguiente paso: ${flow.next.title.toLowerCase()}.` : "Vigencia sin presupuesto asignado."}</p>}
              <div className="progress-row">
                <ProgressBar value={cycle.progressPct} label={`Avance de implementación ${cycle.year}`} />
                <span className="help">Avance de implementación: {cycle.progressPct} %</span>
              </div>
              <div className="cycle-card-foot">
                {canUpdateImplementation && !cycle.closed && <button className="button secondary sm" onClick={() => setUpdatingProgress(cycle)} aria-label={`Actualizar avance de la vigencia ${cycle.year}`}><icons.pencil /> Actualizar avance</button>}
                <button className={`button ${cycle.closed ? "secondary" : ""} sm`} onClick={() => navigate(`/projects/${project.id}/cycles/${cycle.id}`)}>{ctaLabel} <icons.arrowRight /></button>
              </div>
            </article>;
          })}
        </div>}
    </section>

    {editing && <ProjectFormModal project={project} onClose={() => setEditing(false)} />}
    {newCycle && <NewCycleModal projectId={project.id} projectName={project.name} existingYears={project.cycles.map((c) => c.year)} onClose={() => setNewCycle(false)} />}
    {updatingProgress && <ProgressModal project={project} cycle={updatingProgress} onClose={() => setUpdatingProgress(null)} />}
    {confirmDelete && <ConfirmModal
      title="Eliminar proyecto"
      eyebrow={`Célula · ${project.ecosystem}`}
      message={<>Se eliminará <strong>{project.name}</strong> junto con {project.cycles.length === 1 ? "su vigencia" : `sus ${project.cycles.length} vigencias`} y todos sus gastos. Esta acción no se puede deshacer.</>}
      confirmLabel="Eliminar proyecto"
      danger
      submitting={deleting}
      onConfirm={() => { void onConfirmDelete(); }}
      onClose={() => setConfirmDelete(false)}
    />}
  </>;
}
