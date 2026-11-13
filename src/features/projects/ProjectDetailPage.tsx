/* =========================================================================
   Vista: Detalle de proyecto (información + vigencias)
   ========================================================================= */
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore, type Cycle } from "@/store/apiStore";
import { useToast } from "@/components/Toast";
import { icons } from "@/components/icons";
import { Badge, OverFlag, CycleBudgetBar, LoadState, ProgressBar } from "@/components/ui";
import { ConfirmModal } from "@/components/Modal";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";
import { NewCycleModal } from "@/features/cycles/NewCycleModal";
import { ProgressModal } from "@/features/cycles/ProgressModal";
import { money, formatDate, growthHorizonLabel } from "@/lib/format";
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
        <button className="button ghost-on-dark" onClick={() => setConfirmDelete(true)}><icons.trash /> Eliminar</button>
      </div>}
    </div>

    <section className="panel">
      <div className="panel-head">
        <h2><icons.layers /> Vigencias presupuestales</h2>
        {canManageProjects && <button className="button sm" onClick={() => setNewCycle(true)}><icons.plus /> Crear vigencia</button>}
      </div>
      <div className="cycle-list">
        {cycles.length === 0
          ? <div className="empty-cycles"><icons.inbox /><p>Aún no hay vigencias.</p><span className="help">{canManageProjects ? "Crea la primera con el botón «Crear vigencia»." : "El gestor financiero puede crear la primera vigencia."}</span></div>
          : cycles.map((cycle) => {
            const values = expenseTotals(cycle);
            const isOver = values.available < 0;
            const flow = cycleFlow(cycle);
            const cls = cycle.closed ? "closed" : isOver ? "over" : cycle.status === "Iniciado" ? "started" : "";
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
              <div className="cycle-card-grid">
                <div className="cycle-stat"><div className="k">Presupuesto</div><div className="v">{money(cycle.budget || 0)}</div></div>
                <div className="cycle-stat"><div className="k">Ejecutado</div><div className="v">{money(values.executed)}</div></div>
                <div className="cycle-stat"><div className="k">Saldo</div><div className={`v ${isOver ? "neg" : ""}`}>{money(values.available)}</div></div>
              </div>
              {cycle.budget
                ? <CycleBudgetBar cycle={cycle} />
                : <p className="help">{flow.next ? `Siguiente paso: ${flow.next.title.toLowerCase()}.` : "Vigencia sin presupuesto asignado."}</p>}
              <div className="progress-row">
                <ProgressBar value={cycle.progressPct} label={`Avance de implementación ${cycle.year}`} />
                <span className="help">{cycle.progressPct}% de avance de implementación</span>
              </div>
              <div className="cycle-card-foot">
                {canUpdateImplementation && !cycle.closed && <button className="button secondary sm" onClick={() => setUpdatingProgress(cycle)}><icons.pencil /> Actualizar avance</button>}
                <button className={`button ${cycle.closed ? "secondary" : ""} sm`} onClick={() => navigate(`/projects/${project.id}/cycles/${cycle.id}`)}>{ctaLabel} <icons.arrowRight /></button>
              </div>
            </article>;
          })}
      </div>
    </section>

    {editing && <ProjectFormModal project={project} onClose={() => setEditing(false)} />}
    {newCycle && <NewCycleModal projectId={project.id} existingYears={project.cycles.map((c) => c.year)} onClose={() => setNewCycle(false)} />}
    {updatingProgress && <ProgressModal project={project} cycle={updatingProgress} onClose={() => setUpdatingProgress(null)} />}
    {confirmDelete && <ConfirmModal
      title="Eliminar proyecto"
      eyebrow={project.ecosystem}
      message={<>Se eliminará <strong>{project.name}</strong> junto con sus {project.cycles.length} vigencia(s) y todos sus gastos. Esta acción no se puede deshacer.</>}
      confirmLabel="Eliminar proyecto"
      danger
      submitting={deleting}
      onConfirm={() => { void onConfirmDelete(); }}
      onClose={() => setConfirmDelete(false)}
    />}
  </>;
}
