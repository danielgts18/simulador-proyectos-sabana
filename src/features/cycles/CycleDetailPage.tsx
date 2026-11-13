/* =========================================================================
   Vista: Detalle de vigencia (flujo guiado + gastos)
   ========================================================================= */
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore, type Expense } from "@/store/apiStore";
import { useToast } from "@/components/Toast";
import { icons, Icon } from "@/components/icons";
import { Metric, Badge, Stepper, CycleBudgetBar, BudgetLegend, InfoBox, EmptyRow, LoadState } from "@/components/ui";
import { ConfirmModal } from "@/components/Modal";
import { DecisionModal } from "@/features/cycles/DecisionModal";
import { BudgetModal } from "@/features/cycles/BudgetModal";
import { ExpenseModal } from "@/features/expenses/ExpenseModal";
import { MarkExecutedModal } from "@/features/expenses/MarkExecutedModal";
import { money, expenseMonth, formatDate } from "@/lib/format";
import { expenseTotals, cycleFlow, type CycleAction } from "@/lib/calculations";
import type { ExpenseStatus } from "@/lib/types";

type ModalState =
  | { kind: "decision" | "budget" | "expense-new" | "close" }
  | { kind: "expense-edit" | "expense-dup" | "expense-delete" | "expense-exec"; expense: Expense }
  | null;

export function CycleDetailPage() {
  const { projectId = "", cycleId = "" } = useParams();
  const store = useStore();
  const { getProject, getCycle, fetchProjectDetail, accessibleProjects, isJefatura, canManageProjects, canManageExpenses, submitReview, closeCycle, deleteExpense } = store;
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
  const canClose = canManageProjects && !cycle.closed && !flow.rejected && flow.stageIndex >= 3;
  const stateLabel = cycle.closed ? "Cerrada" : isOver ? "Sobreejecución" : flow.rejected ? "Rechazada" : "Abierta";
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
  const pendingOwner = (action: CycleAction) => action === "submit-review" ? "el gestor financiero" : "la Jefatura o el gestor financiero";

  const runAction = async (action: CycleAction) => {
    if (!canRun(action)) return;
    if (action === "new-expense") { setModal({ kind: "expense-new" }); return; }
    if (action === "submit-review") {
      setBusy(true);
      const result = await submitReview(project.id, cycle.id);
      setBusy(false);
      if (!result.ok) { notify(result.message ?? "No fue posible enviar la vigencia a revisión.", true); return; }
      notify("La vigencia fue enviada a revisión.");
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
    notify("La vigencia fue cerrada de forma definitiva.");
  };

  const onConfirmDeleteExpense = async (expense: Expense) => {
    setBusy(true);
    const result = await deleteExpense(project.id, cycle.id, expense.id);
    setBusy(false);
    if (!result.ok) { notify(result.message ?? "No fue posible eliminar el gasto.", true); return; }
    setModal(null);
    notify("Gasto eliminado. El saldo disponible fue actualizado.");
  };

  const next = flow.next && flow.next.action !== "new-expense" ? flow.next : null;

  return <>
    <div className="page-head">
      <div className="titles">
        <button className="button subtle" onClick={() => navigate(`/projects/${project.id}`)}><icons.arrowLeft /> {project.name}</button>
        <div className="eyebrow">{project.ecosystem} · Ciclo anual</div>
        <h1>Vigencia {cycle.year}</h1>
        <p className="subtitle">{project.name} · {project.leader}</p>
      </div>
      {(canRegisterExpense || canClose) && <div className="head-actions">
        {canRegisterExpense && <button className="button" onClick={() => setModal({ kind: "expense-new" })}><icons.plus /> Registrar gasto</button>}
        {canClose && <button className="button ghost-danger" onClick={() => setModal({ kind: "close" })}><icons.lock /> Cerrar vigencia</button>}
      </div>}
    </div>

    <Stepper flow={flow} />

    {flow.closed
      ? <div className="next-step terminal"><div className="next-step-status"><span className="st-ico"><icons.lock /></span><div className="next-step-main"><div className="eyebrow">Vigencia cerrada</div><h3>Cierre definitivo</h3><p>La información permanece disponible solo para consulta. La vigencia no se reabre ni se editan gastos.</p></div></div></div>
      : flow.rejected
        ? <div className="next-step tone-danger"><div className="next-step-status"><span className="st-ico"><icons.alert /></span><div className="next-step-main"><div className="eyebrow">Decisión registrada</div><h3>Vigencia rechazada</h3><p>{canManageProjects ? "La Subcomisión rechazó esta vigencia. Puedes cerrarla para archivarla de forma definitiva." : "La Subcomisión rechazó esta vigencia. El gestor financiero puede cerrarla para archivarla."}</p></div></div>{canManageProjects && <button className="button danger lg" onClick={() => setModal({ kind: "close" })}><icons.lock /> Cerrar vigencia</button>}</div>
        : next && <div className="next-step">
          <div className="next-step-main"><div className="eyebrow">Siguiente paso</div><h3>{next.title}</h3><p>{next.desc}</p></div>
          {canRun(next.action)
            ? <button className="button lg" disabled={busy} onClick={() => { void runAction(next.action); }}><Icon name={next.icon} /> {busy ? "Procesando…" : next.label}</button>
            : <span className="next-step-owner"><icons.clock /> Pendiente de {pendingOwner(next.action)}</span>}
        </div>}

    <div className="metrics m5">
      <Metric label="Presupuesto" value={money(cycle.budget || 0)} icon="wallet2" />
      <Metric label="Comprometido" value={money(values.committed)} icon="clock" tone="tone-exec" />
      <Metric label="Ejecutado" value={money(values.executed)} icon="coins" tone="tone-exec" />
      <Metric label="Saldo disponible" value={money(values.available)} icon="wallet" tone={isOver ? "tone-alert" : "tone-avail"} />
      <Metric label="Estado" value={stateLabel} icon={isOver ? "alert" : "circleCheck"} tone={isOver ? "tone-alert" : cycle.closed ? "" : "tone-avail"} />
    </div>

    <details className="approval-details">
      <summary><span><icons.gavel /> Aprobación anual</span><Badge value={cycle.approval} /></summary>
      <div className="approval-details-content">
        <dl className="definition" style={{ gridTemplateColumns: "1fr" }}>
          <div><dt>Resultado</dt><dd><Badge value={cycle.approval} /></dd></div>
          <div><dt>Estado operativo</dt><dd><Badge value={cycle.status} /></dd></div>
          <div><dt>Fecha de aprobación</dt><dd>{cycle.approvalDate ? formatDate(cycle.approvalDate) : "Pendiente"}</dd></div>
          <div><dt>Número de acta</dt><dd>{cycle.act || "Pendiente"}</dd></div>
        </dl>
        <div className="stack-top">
          <InfoBox cream={!cycle.closed}>{cycle.closed ? "La vigencia está cerrada. La información permanece disponible solo para consulta; no se reabre ni se editan gastos." : "Los gastos comprometidos y ejecutados descuentan del saldo. Si superan el presupuesto, la vigencia se marca en sobreejecución."}</InfoBox>
        </div>
      </div>
    </details>

    <section className="panel">
      <div className="panel-head">
        <h2>Gastos registrados</h2>
        <div className="panel-head-actions">
          <div className="filters">
            <div className="filter-search"><icons.search /><input type="search" placeholder="Buscar proveedor o tipo" aria-label="Buscar gastos por proveedor o tipo" value={expSearch} onChange={(e) => setExpSearch(e.target.value)} /></div>
            <select value={expStatus} onChange={(e) => setExpStatus(e.target.value as "" | ExpenseStatus)} aria-label="Filtrar por estado del gasto">
              <option value="">Todos los estados</option>
              <option value="Comprometido">Comprometido</option>
              <option value="Ejecutado">Ejecutado</option>
            </select>
          </div>
          <span className="help">{filteredExpenses.length} de {cycle.expenses.length} registro{cycle.expenses.length === 1 ? "" : "s"}</span>
          {canRegisterExpense && <button className="button sm" onClick={() => setModal({ kind: "expense-new" })}><icons.plus /> Registrar gasto</button>}
        </div>
      </div>
      {categories.length > 1 && <div className="cat-filter">
        <span className="cat-filter-label">Filtrar por categoría:</span>
        {categories.map((cat) => <button key={cat} type="button" aria-pressed={catFilter.includes(cat)} className={`cat-chip ${catFilter.includes(cat) ? "active" : ""}`} onClick={() => toggleCat(cat)}>{cat}</button>)}
        {catFilter.length > 0 && <button type="button" className="cat-chip clear" onClick={() => setCatFilter([])}>× Limpiar</button>}
      </div>}
      {cycle.budget > 0 && <div className="stack-bottom"><CycleBudgetBar cycle={cycle} /><BudgetLegend /></div>}
      <div className="table-wrap table-scroll">
        <table>
          <thead><tr><th>Mes</th><th>Proveedor</th><th>Tipo</th><th>Valor</th><th>Estado</th><th>Orden de pedido</th><th>Comprobante</th><th>Acciones</th></tr></thead>
          <tbody>
            {cycle.expenses.length === 0
              ? <EmptyRow colSpan={8}>Aún no se han registrado gastos.</EmptyRow>
              : filteredExpenses.length === 0
              ? <EmptyRow colSpan={8}>Ningún gasto coincide con el filtro.</EmptyRow>
              : filteredExpenses.map((expense) => <tr key={expense.id}>
                <td>{expenseMonth(expense.date)}</td>
                <td className="cell-strong">{expense.provider}</td>
                <td>{expense.type}</td>
                <td className="money">{money(expense.value)}</td>
                <td><Badge value={expense.status} /></td>
                <td data-label="Orden de pedido">{expense.order || (expense.status === "Ejecutado" ? <span className="exec-empty">Pendiente</span> : "—")}</td>
                <td data-label="Comprobante">{expense.receipt || (expense.status === "Ejecutado" ? <span className="exec-empty">Pendiente</span> : "—")}</td>
                <td>{cycle.closed || !canEditExpenses
                  ? <span className="help">Solo consulta</span>
                  : <div className="expense-actions">
                    {expense.status === "Comprometido" && <button className="button subtle sm" onClick={() => setModal({ kind: "expense-exec", expense })}><icons.circleCheck /> Marcar ejecutado</button>}
                    <button className="button subtle sm" onClick={() => setModal({ kind: "expense-dup", expense })}><icons.copy /> Duplicar</button>
                    {/* En un gasto ejecutado solo se corrigen la orden de pedido y el comprobante. */}
                    <button className="button subtle sm" onClick={() => setModal({ kind: "expense-edit", expense })}><icons.pencil /> Corregir</button>
                    <button className="button ghost-danger sm" onClick={() => setModal({ kind: "expense-delete", expense })}><icons.trash /> Eliminar</button>
                  </div>}
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    {modal?.kind === "decision" && <DecisionModal projectId={project.id} cycle={cycle} onClose={() => setModal(null)} />}
    {modal?.kind === "budget" && <BudgetModal projectId={project.id} cycle={cycle} onClose={() => setModal(null)} />}
    {modal?.kind === "expense-new" && <ExpenseModal project={project} cycle={cycle} onClose={() => setModal(null)} />}
    {modal?.kind === "expense-edit" && <ExpenseModal project={project} cycle={cycle} expense={modal.expense} onClose={() => setModal(null)} />}
    {modal?.kind === "expense-dup" && <ExpenseModal project={project} cycle={cycle} expense={modal.expense} duplicate onClose={() => setModal(null)} />}
    {modal?.kind === "expense-exec" && <MarkExecutedModal project={project} cycle={cycle} expense={modal.expense} onClose={() => setModal(null)} />}
    {modal?.kind === "close" && <ConfirmModal
      title="Cerrar vigencia"
      eyebrow={`Vigencia ${cycle.year}`}
      message="Cerrar la vigencia bloqueará cualquier modificación de gastos. La información quedará disponible solo para consulta y la vigencia no se puede reabrir."
      confirmLabel="Cerrar vigencia"
      danger
      submitting={busy}
      onConfirm={() => { void onConfirmClose(); }}
      onClose={() => setModal(null)}
    />}
    {modal?.kind === "expense-delete" && <ConfirmModal
      title="Eliminar gasto"
      eyebrow="Gastos"
      message={<>Se eliminará el gasto de <strong>{money(modal.expense.value)}</strong> a <strong>{modal.expense.provider}</strong>. Esta acción no se puede deshacer.</>}
      confirmLabel="Eliminar gasto"
      danger
      submitting={busy}
      onConfirm={() => { void onConfirmDeleteExpense(modal.expense); }}
      onClose={() => setModal(null)}
    />}
  </>;
}
