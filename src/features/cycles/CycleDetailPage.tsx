/* =========================================================================
   Vista: Detalle de vigencia (flujo guiado + gastos)
   ========================================================================= */
import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore } from "@/store/store";
import { useToast } from "@/components/Toast";
import { icons, Icon } from "@/components/icons";
import { Metric, Badge, Stepper, CycleBudgetBar, BudgetLegend, InfoBox, EmptyRow } from "@/components/ui";
import { DecisionModal } from "@/features/cycles/DecisionModal";
import { BudgetModal } from "@/features/cycles/BudgetModal";
import { ExpenseModal } from "@/features/expenses/ExpenseModal";
import { money, expenseMonth } from "@/lib/format";
import { expenseTotals, cycleFlow, type CycleAction } from "@/lib/calculations";
import type { Expense } from "@/lib/types";

type ModalState =
  | { kind: "decision" | "budget" | "expense-new" }
  | { kind: "expense-edit" | "expense-dup"; expense: Expense }
  | null;

export function CycleDetailPage() {
  const { projectId = "", cycleId = "" } = useParams();
  const store = useStore();
  const { getProject, getCycle, accessibleProjects, canManagePortfolio, canManageExpenses, submitReview, closeCycle, deleteExpense } = store;
  const { notify } = useToast();
  const navigate = useNavigate();
  const [modal, setModal] = useState<ModalState>(null);

  const project = getProject(Number(projectId));
  if (!project || !accessibleProjects().includes(project)) return <Navigate to="/projects" replace />;
  const cycle = getCycle(project, Number(cycleId));
  if (!cycle) return <Navigate to={`/projects/${project.id}`} replace />;

  const values = expenseTotals(cycle);
  const isOver = values.available < 0;
  const flow = cycleFlow(cycle);
  const canEditExpenses = canManageExpenses(project) && !cycle.closed;
  const canRegisterExpense = flow.next?.action === "new-expense" && canEditExpenses;
  const canClose = canManagePortfolio && !cycle.closed && !flow.rejected && flow.stageIndex >= 3;
  const stateLabel = cycle.closed ? "Cerrada" : isOver ? "Sobreejecución" : flow.rejected ? "Rechazada" : "Abierta";

  const runAction = (action: CycleAction) => {
    if (action === "new-expense") {
      if (!canManageExpenses(project)) { notify("No tienes permiso para registrar gastos en este proyecto.", true); return; }
      setModal({ kind: "expense-new" }); return;
    }
    if (!canManagePortfolio) { notify("Tu rol solo permite gestionar gastos en tus proyectos asignados.", true); return; }
    if (action === "submit-review") { submitReview(project.id, cycle.id); notify("La vigencia fue enviada a revisión."); }
    else if (action === "decision") setModal({ kind: "decision" });
    else setModal({ kind: "budget" }); // start-budget | assign-budget
  };

  const onClose = () => {
    if (!canManagePortfolio) { notify("Tu rol no permite cerrar vigencias.", true); return; }
    if (window.confirm("Cerrar la vigencia bloqueará cualquier modificación de gastos. ¿Continuar?")) {
      closeCycle(project.id, cycle.id);
      notify("La vigencia fue cerrada de forma definitiva.");
    }
  };

  const onDeleteExpense = (expense: Expense) => {
    if (window.confirm(`Eliminar el gasto de ${money(expense.value)} a ${expense.provider}. Esta acción no se puede deshacer. ¿Continuar?`)) {
      deleteExpense(project.id, cycle.id, expense.id);
      notify("Gasto eliminado. El saldo disponible fue actualizado.");
    }
  };

  return <>
    <div className="page-head">
      <div className="titles">
        <button className="button subtle" onClick={() => navigate(`/projects/${project.id}`)}><icons.arrowLeft /> {project.name}</button>
        <div className="eyebrow" style={{ marginTop: 8 }}>{project.ecosystem} · Ciclo anual</div>
        <h1>Vigencia {cycle.year}</h1>
        <p className="subtitle">{project.name} · {project.leader}</p>
      </div>
      {canClose && <button className="button ghost-danger" onClick={onClose}><icons.lock /> Cerrar vigencia</button>}
    </div>

    <Stepper flow={flow} />

    {flow.closed
      ? <div className="next-step terminal"><div className="next-step-status"><span className="st-ico"><icons.lock /></span><div className="next-step-main"><div className="eyebrow">Vigencia cerrada</div><h3>Cierre definitivo</h3><p>La información permanece disponible solo para consulta. La vigencia no se reabre ni se editan gastos.</p></div></div></div>
      : flow.rejected
        ? <div className="next-step tone-danger"><div className="next-step-status"><span className="st-ico"><icons.alert /></span><div className="next-step-main"><div className="eyebrow">Decisión registrada</div><h3>Vigencia rechazada</h3><p>La Subcomisión rechazó esta vigencia. Puedes cerrarla para archivarla de forma definitiva.</p></div></div>{canManagePortfolio && <button className="button danger lg" onClick={onClose}><icons.lock /> Cerrar vigencia</button>}</div>
        : (!canRegisterExpense && flow.next) && <div className="next-step">
          <div className="next-step-main"><div className="eyebrow">Siguiente paso</div><h3>{flow.next.title}</h3><p>{flow.next.desc}</p></div>
          <button className="button lg" onClick={() => flow.next && runAction(flow.next.action)}><Icon name={flow.next.icon} /> {flow.next.label}</button>
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
          <div><dt>Fecha de aprobación</dt><dd>{cycle.approvalDate || "Pendiente"}</dd></div>
          <div><dt>Número de acta</dt><dd>{cycle.act || "Pendiente"}</dd></div>
        </dl>
        <div style={{ marginTop: 8 }}>
          <InfoBox cream={!cycle.closed}>{cycle.closed ? "La vigencia está cerrada. La información permanece disponible solo para consulta; no se reabre ni se editan gastos." : "Los gastos comprometidos y ejecutados descuentan del saldo. No se permite registrar valores superiores al saldo disponible."}</InfoBox>
        </div>
      </div>
    </details>

    <section className="panel">
      <div className="panel-head">
        <h2>Gastos registrados</h2>
        <div className="panel-head-actions">
          <span className="help">{cycle.expenses.length} registro{cycle.expenses.length === 1 ? "" : "s"}</span>
          {canRegisterExpense && <button className="button sm" onClick={() => setModal({ kind: "expense-new" })}><icons.plus /> Registrar gasto</button>}
        </div>
      </div>
      {cycle.budget > 0 && <div style={{ marginBottom: 18 }}><CycleBudgetBar cycle={cycle} /><BudgetLegend /></div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Mes</th><th>Proveedor</th><th>Tipo</th><th>Valor</th><th>Estado</th><th>Orden de pedido</th><th>Acción</th></tr></thead>
          <tbody>
            {cycle.expenses.length === 0
              ? <EmptyRow colSpan={7}>Aún no se han registrado gastos.</EmptyRow>
              : cycle.expenses.map((expense) => <tr key={expense.id}>
                <td>{expenseMonth(expense.date)}</td>
                <td className="cell-strong">{expense.provider}</td>
                <td>{expense.type}</td>
                <td className="money">{money(expense.value)}</td>
                <td><Badge value={expense.status} /></td>
                <td>{expense.order || "—"}</td>
                <td>{cycle.closed || !canEditExpenses
                  ? <span className="help">Consulta</span>
                  : <div className="expense-actions">
                    <button className="button subtle sm" onClick={() => setModal({ kind: "expense-dup", expense })}><icons.copy /> Duplicar</button>
                    <button className="button subtle sm" onClick={() => setModal({ kind: "expense-edit", expense })}><icons.pencil /> Corregir</button>
                    <button className="button ghost-danger sm" onClick={() => onDeleteExpense(expense)}><icons.trash /> Eliminar</button>
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
  </>;
}
