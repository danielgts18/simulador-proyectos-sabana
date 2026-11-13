/* =========================================================================
   Vista: Detalle de vigencia (flujo guiado + gastos)
   ========================================================================= */
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore, type Expense } from "@/store/apiStore";
import { useToast } from "@/components/Toast";
import { icons, Icon } from "@/components/icons";
import { PageHeader, Tag, Kpi, Pill, Badge, Stepper, CycleBudgetBar, BarLegend, InfoBox, EmptyRow, LoadState } from "@/components/ui";
import { ConfirmModal } from "@/components/Modal";
import { DecisionModal } from "@/features/cycles/DecisionModal";
import { BudgetModal } from "@/features/cycles/BudgetModal";
import { ExpenseModal } from "@/features/expenses/ExpenseModal";
import { MarkExecutedModal } from "@/features/expenses/MarkExecutedModal";
import { ProgressModal } from "@/features/cycles/ProgressModal";
import { money, moneyShort, expenseMonth, formatDate } from "@/lib/format";
import { expenseTotals, cycleFlow, supportExempt, type CycleAction } from "@/lib/calculations";
import type { ExpenseStatus } from "@/lib/types";

type ModalState =
  | { kind: "decision" | "budget" | "expense-new" | "close" | "progress" }
  | { kind: "expense-edit" | "expense-dup" | "expense-delete" | "expense-exec"; expense: Expense }
  | null;

export function CycleDetailPage() {
  const { projectId = "", cycleId = "" } = useParams();
  const store = useStore();
  const { getProject, getCycle, fetchProjectDetail, accessibleProjects, activeUser, isJefatura, canManageProjects, canManageExpenses, submitReview, closeCycle, deleteExpense, saveExpense } = store;
  const { notify } = useToast();
  const navigate = useNavigate();
  const [modal, setModal] = useState<ModalState>(null);
  const [loaded, setLoaded] = useState(false);
  // Error de red / servidor al cargar el detalle: se muestra con opción de reintentar
  // (403/404 redirigen con aviso). El proyecto puede seguir disponible desde caché.
  const [detailError, setDetailError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [expSearch, setExpSearch] = useState("");
  const [expStatus, setExpStatus] = useState<"" | ExpenseStatus>("");
  const [catFilter, setCatFilter] = useState<string[]>([]);
  const toggleCat = (cat: string) => setCatFilter((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);

  const pid = Number(projectId);
  const cid = Number(cycleId);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setDetailError(null);
    void fetchProjectDetail(pid).then((result) => {
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
  }, [pid, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const project = getProject(pid);
  const cycle = getCycle(project, cid);

  // Guardas por id (no por referencia): comparar por id evita que un cambio
  // en la referencia del objeto (después de una mutación) nos expulse de la vista.
  if (loaded && !detailError && (!project || !accessibleProjects().some((p) => p.id === pid))) return <Navigate to="/projects" replace />;
  // Detalle cargado pero la vigencia no existe (URL inválida o vigencia borrada): volver al proyecto.
  if (loaded && !detailError && project && !cycle) return <Navigate to={`/projects/${project.id}`} replace />;
  if (!project || !cycle) {
    return <LoadState loading={!loaded} error={detailError} onRetry={() => setReloadKey((k) => k + 1)}>Cargando vigencia…</LoadState>;
  }

  const values = expenseTotals(cycle);
  const isOver = values.available < 0;
  const flow = cycleFlow(cycle);
  const canEditExpenses = canManageExpenses(project) && !cycle.closed;
  // El registro de gastos se habilita aunque la vigencia aún no esté aprobada
  // ni tenga presupuesto: basta con poder editar y que no esté cerrada.
  const canRegisterExpense = canEditExpenses;
  // «Cerrar vigencia» vive en un solo lugar (encabezado): también para archivar una vigencia rechazada.
  const canClose = canManageProjects && !cycle.closed && (flow.rejected || flow.stageIndex >= 3);
  const canUpdateProgress = !cycle.closed && (canManageProjects || (activeUser?.role === "LIDER_PROYECTO" && activeUser.id === project.leaderUserId));
  const state = cycle.closed ? { label: "Cerrada", tone: "neutral" as const }
    : isOver ? { label: "Sobreejecutada", tone: "danger" as const }
      : flow.rejected ? { label: "Rechazada", tone: "neutral" as const }
        : { label: "Abierta", tone: "success" as const };
  const term = expSearch.trim().toLowerCase();
  // Categorías (tipos de gasto) presentes en la vigencia, para el filtro multi-selección.
  const categories = [...new Set(cycle.expenses.map((e) => e.type))].sort((a, b) => a.localeCompare(b));
  const filteredExpenses = cycle.expenses.filter((e) =>
    (!expStatus || e.status === expStatus) &&
    (catFilter.length === 0 || catFilter.includes(e.type)) &&
    (!term || `${e.provider} ${e.type}`.toLowerCase().includes(term)),
  );

  // Quién puede ejecutar cada paso del flujo (coincide con las reglas del servidor).
  const canRun = (action: CycleAction) =>
    action === "new-expense" ? canManageExpenses(project)
      : action === "submit-review" ? canManageProjects
        : isJefatura || canManageProjects;
  const pendingOwner = (action: CycleAction) => action === "submit-review" ? "del gestor financiero" : "de la Jefatura o del gestor financiero";

  const runAction = async (action: CycleAction) => {
    if (!canRun(action)) return;
    if (action === "new-expense") { setModal({ kind: "expense-new" }); return; }
    if (action === "submit-review") {
      setBusy(true);
      const result = await submitReview(project.id, cycle.id);
      setBusy(false);
      if (!result.ok) { notify(result.message ?? "No fue posible enviar la vigencia a revisión.", true); return; }
      notify("Vigencia enviada a revisión.");
      return;
    }
    setModal({ kind: action === "decision" ? "decision" : "budget" });
  };

  const onConfirmClose = async () => {
    setBusy(true);
    const result = await closeCycle(project.id, cycle.id);
    setBusy(false);
    if (!result.ok) { notify(result.message ?? "No fue posible cerrar la vigencia.", true); return; }
    setModal(null);
    notify("Vigencia cerrada.");
  };

  // Practicantes y recurso humano se marcan ejecutados de inmediato; el resto pide pedido y comprobante.
  const markExecuted = async (expense: Expense) => {
    if (!supportExempt(expense.type)) { setModal({ kind: "expense-exec", expense }); return; }
    setBusy(true);
    const result = await saveExpense(project.id, cycle.id, expense.id, {
      month: expense.date.slice(5, 7), provider: expense.provider, type: expense.type, value: expense.value, status: "Ejecutado", order: "", receipt: "",
    });
    setBusy(false);
    if (!result.ok) { notify(result.message ?? "No fue posible marcar el gasto como ejecutado.", true); return; }
    notify("Gasto marcado como ejecutado.");
  };

  const onConfirmDeleteExpense = async (expense: Expense) => {
    setBusy(true);
    const result = await deleteExpense(project.id, cycle.id, expense.id);
    setBusy(false);
    if (!result.ok) { notify(result.message ?? "No fue posible eliminar el gasto.", true); return; }
    setModal(null);
    notify("Gasto eliminado.");
  };

  const next = flow.next && flow.next.action !== "new-expense" ? flow.next : null;

  return <>
    <PageHeader
      detail
      eyebrow={`${project.ecosystem} · ${project.name}`}
      title={`Vigencia ${cycle.year}`}
      tags={<>
        <Pill tone={state.tone}>{state.label}</Pill>
        <Badge value={cycle.approval} />
        <Tag icon="user">{project.leader}</Tag>
      </>}
      actions={(canRegisterExpense || canUpdateProgress || canClose) && <>
        {canRegisterExpense && <button className="button" onClick={() => setModal({ kind: "expense-new" })}><icons.plus /> Registrar gasto</button>}
        {canUpdateProgress && <button className="button secondary" onClick={() => setModal({ kind: "progress" })}><icons.pencil /> Actualizar avance</button>}
        {canClose && <button className="button ghost-danger" onClick={() => setModal({ kind: "close" })}><icons.lock /> Cerrar vigencia</button>}
      </>}
    />

    <Stepper flow={flow} />

    {flow.closed
      ? <div className="next-step tone-neutral"><div className="next-step-status"><span className="st-ico"><icons.lock /></span><div className="next-step-main"><div className="eyebrow">Vigencia cerrada</div><h2>Cierre definitivo</h2><p>La información queda disponible solo para consulta: la vigencia no se reabre ni se editan gastos.</p></div></div></div>
      : flow.rejected
        ? <div className="next-step tone-danger"><div className="next-step-status"><span className="st-ico"><icons.alert /></span><div className="next-step-main"><div className="eyebrow">Decisión registrada</div><h2>Vigencia rechazada</h2><p>{canManageProjects ? "La Subcomisión rechazó esta vigencia. Para archivarla usa «Cerrar vigencia» en el encabezado." : "La Subcomisión rechazó esta vigencia. El gestor financiero puede cerrarla para archivarla."}</p></div></div></div>
        : next && <div className="next-step">
          <div className="next-step-main"><div className="eyebrow">Siguiente paso</div><h2>{next.title}</h2><p>{next.desc}</p></div>
          {canRun(next.action)
            ? <button className="button lg" disabled={busy} onClick={() => { void runAction(next.action); }}><Icon name={next.icon} /> {busy ? "Guardando…" : next.label}</button>
            : <span className="next-step-owner"><icons.clock /> Pendiente {pendingOwner(next.action)}</span>}
        </div>}

    <div className="kpis">
      <Kpi label="Presupuesto" value={moneyShort(cycle.budget || 0)} icon="wallet2" />
      <Kpi label="Ejecutado" value={moneyShort(values.executed)} icon="coins" />
      <Kpi label="Comprometido" value={moneyShort(values.committed)} icon="clock" />
      <Kpi label={isOver ? "Sobreejecución" : "Disponible"} value={moneyShort(Math.abs(values.available))} icon="wallet" tone={isOver ? "danger" : "success"} />
      <Kpi label="Avance de implementación" value={`${cycle.progressPct} %`} icon="play" />
    </div>

    <details className="approval-details">
      <summary><span><icons.gavel /> Aprobación de la Subcomisión</span><Badge value={cycle.approval} /></summary>
      <div className="approval-details-content">
        <dl className="definition one-col">
          <div><dt>Resultado</dt><dd><Badge value={cycle.approval} /></dd></div>
          <div><dt>Estado operativo</dt><dd><Badge value={cycle.status} /></dd></div>
          <div><dt>Fecha de aprobación</dt><dd>{cycle.approvalDate ? formatDate(cycle.approvalDate) : "Pendiente"}</dd></div>
          <div><dt>Número de acta</dt><dd>{cycle.act || "Pendiente"}</dd></div>
        </dl>
        <div className="stack-top">
          <InfoBox cream>Los gastos comprometidos y ejecutados descuentan del saldo. Si superan el presupuesto, la vigencia queda sobreejecutada.</InfoBox>
        </div>
      </div>
    </details>

    <section className="panel">
      <div className="panel-head">
        <h2><icons.coins /> Gastos</h2>
        <div className="panel-head-actions">
          <div className="filters">
            <div className="filter-search"><icons.search /><input type="search" placeholder="Buscar proveedor o tipo" aria-label="Buscar gastos por proveedor o tipo" value={expSearch} onChange={(e) => setExpSearch(e.target.value)} /></div>
            <select value={expStatus} onChange={(e) => setExpStatus(e.target.value as "" | ExpenseStatus)} aria-label="Filtrar por estado del gasto">
              <option value="">Todos los estados</option>
              <option value="Comprometido">Comprometido</option>
              <option value="Ejecutado">Ejecutado</option>
            </select>
          </div>
          <span className="help">{filteredExpenses.length} de {cycle.expenses.length} gasto{cycle.expenses.length === 1 ? "" : "s"}</span>
        </div>
      </div>
      {categories.length > 1 && <div className="cat-filter" role="group" aria-label="Filtrar por tipo de gasto">
        <span className="label-caps">Tipo de gasto</span>
        {categories.map((cat) => <button key={cat} type="button" aria-pressed={catFilter.includes(cat)} className={`cat-chip ${catFilter.includes(cat) ? "active" : ""}`} onClick={() => toggleCat(cat)}>{cat}</button>)}
        {catFilter.length > 0 && <button type="button" className="cat-chip clear" onClick={() => setCatFilter([])}>× Quitar filtro</button>}
      </div>}
      {cycle.budget > 0 && <div className="stack-bottom"><CycleBudgetBar cycle={cycle} /><BarLegend /></div>}
      <div className="table-wrap">
        <table className="table-min">
          <thead><tr><th>Mes</th><th>Proveedor</th><th>Tipo de gasto</th><th className="num">Valor</th><th>Estado</th><th>Orden de pedido</th><th>Comprobante</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {cycle.expenses.length === 0
              ? <EmptyRow colSpan={8} title="Aún no hay gastos registrados">{canRegisterExpense ? "Usa «Registrar gasto» en el encabezado." : undefined}</EmptyRow>
              : filteredExpenses.length === 0
              ? <EmptyRow colSpan={8} title="Ningún gasto coincide con el filtro" />
              : filteredExpenses.map((expense) => {
                const exempt = supportExempt(expense.type);
                const support = (value: string) => exempt ? <span className="muted-note">No aplica</span>
                  : value || (expense.status === "Ejecutado" ? <Pill tone="warning">Pendiente</Pill> : <span className="muted-note">—</span>);
                const who = `${expense.provider} (${expenseMonth(expense.date)})`;
                return <tr key={expense.id}>
                  <td>{expenseMonth(expense.date)}</td>
                  <td className="cell-strong">{expense.provider}</td>
                  <td>{expense.type}</td>
                  <td className="num money">{money(expense.value)}</td>
                  <td><Badge value={expense.status} /></td>
                  <td>{support(expense.order)}</td>
                  <td>{support(expense.receipt)}</td>
                  <td>{cycle.closed || !canEditExpenses
                    ? <span className="muted-note">Solo consulta</span>
                    : <div className="row-actions">
                      {expense.status === "Comprometido" && <button className="button subtle sm icon" disabled={busy} onClick={() => { void markExecuted(expense); }} aria-label={`Marcar como ejecutado el gasto de ${who}`} title="Marcar como ejecutado"><icons.circleCheck /></button>}
                      <button className="button subtle sm icon" onClick={() => setModal({ kind: "expense-dup", expense })} aria-label={`Duplicar el gasto de ${who}`} title="Duplicar"><icons.copy /></button>
                      {/* En un gasto ejecutado solo se corrigen la orden de pedido y el comprobante. */}
                      {!(expense.status === "Ejecutado" && exempt) && <button className="button subtle sm icon" onClick={() => setModal({ kind: "expense-edit", expense })} aria-label={`Corregir el gasto de ${who}`} title="Corregir"><icons.pencil /></button>}
                      <button className="button subtle ghost-danger sm icon" onClick={() => setModal({ kind: "expense-delete", expense })} aria-label={`Eliminar el gasto de ${who}`} title="Eliminar"><icons.trash /></button>
                    </div>}
                  </td>
                </tr>;
              })}
          </tbody>
        </table>
      </div>
    </section>

    {modal?.kind === "decision" && <DecisionModal projectId={project.id} projectName={project.name} cycle={cycle} onClose={() => setModal(null)} />}
    {modal?.kind === "budget" && <BudgetModal projectId={project.id} projectName={project.name} cycle={cycle} onClose={() => setModal(null)} />}
    {modal?.kind === "progress" && <ProgressModal project={project} cycle={cycle} onClose={() => setModal(null)} />}
    {modal?.kind === "expense-new" && <ExpenseModal project={project} cycle={cycle} onClose={() => setModal(null)} />}
    {modal?.kind === "expense-edit" && <ExpenseModal project={project} cycle={cycle} expense={modal.expense} onClose={() => setModal(null)} />}
    {modal?.kind === "expense-dup" && <ExpenseModal project={project} cycle={cycle} expense={modal.expense} duplicate onClose={() => setModal(null)} />}
    {modal?.kind === "expense-exec" && <MarkExecutedModal project={project} cycle={cycle} expense={modal.expense} onClose={() => setModal(null)} />}
    {modal?.kind === "close" && <ConfirmModal
      title="Cerrar vigencia"
      eyebrow={`Vigencia ${cycle.year} · ${project.name}`}
      message="Cerrar la vigencia bloqueará cualquier modificación de gastos. La información quedará disponible solo para consulta y la vigencia no se puede reabrir."
      confirmLabel="Cerrar vigencia"
      danger
      submitting={busy}
      onConfirm={() => { void onConfirmClose(); }}
      onClose={() => setModal(null)}
    />}
    {modal?.kind === "expense-delete" && <ConfirmModal
      title="Eliminar gasto"
      eyebrow={`Vigencia ${cycle.year} · ${project.name}`}
      message={<>Se eliminará el gasto de <strong>{money(modal.expense.value)}</strong> a <strong>{modal.expense.provider}</strong>. Esta acción no se puede deshacer.</>}
      confirmLabel="Eliminar gasto"
      danger
      submitting={busy}
      onConfirm={() => { void onConfirmDeleteExpense(modal.expense); }}
      onClose={() => setModal(null)}
    />}
  </>;
}
