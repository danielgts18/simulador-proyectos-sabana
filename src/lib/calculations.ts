/* =========================================================================
   Lógica de negocio (cálculos) · Seguimiento presupuestal
   Funciones puras sobre datos.
   ========================================================================= */
import type { IconName } from "@/components/icons";
import type { ApprovalStatus, CycleStatus, ExpenseStatus } from "@/lib/types";

// Interfaz mínima de vigencia sobre la que operan los cálculos.
interface CycleLike {
  closed: boolean;
  approval: ApprovalStatus;
  status: CycleStatus;
  budget: number;
  expenses: { status: ExpenseStatus; value: number }[];
}

export interface Totals { committed: number; executed: number; used: number; available: number }

export function expenseTotals(cycle: CycleLike): Totals {
  const committed = cycle.expenses.filter((e) => e.status === "Comprometido").reduce((sum, e) => sum + e.value, 0);
  const executed = cycle.expenses.filter((e) => e.status === "Ejecutado").reduce((sum, e) => sum + e.value, 0);
  return { committed, executed, used: committed + executed, available: (cycle.budget || 0) - committed - executed };
}

/** Mapea el estado (en español) a la clase de color del sistema de diseño. */
export function statusClass(value: string): string {
  const classes: Record<string, string> = {
    "Borrador": "draft", "En revisión": "review", "Aprobado": "approved", "Rechazado": "rejected",
    "Iniciado": "started", "Cerrado": "closed", "Comprometido": "committed", "Ejecutado": "executed", "Sobreejecución": "over",
    "Activo": "approved", "Inactivo": "closed",
  };
  return classes[value] || "draft";
}

/* ---- Flujo guiado del ciclo de vigencia -------------------------------- */
export type CycleAction = "submit-review" | "decision" | "start-budget" | "assign-budget" | "new-expense";
export interface CycleStep { title: string; desc: string; action: CycleAction; label: string; icon: IconName }
export interface CycleFlow { stageIndex: number; closed?: boolean; rejected?: boolean; next: CycleStep | null }

/** Determina la etapa activa y la siguiente acción sugerida de una vigencia. */
export function cycleFlow(cycle: CycleLike): CycleFlow {
  if (cycle.closed) return { stageIndex: 5, closed: true, next: null };
  if (cycle.approval === "Borrador") return { stageIndex: 0, next: { title: "Enviar a revisión", desc: "Envía la vigencia a la Subcomisión para su evaluación anual.", action: "submit-review", label: "Enviar a revisión", icon: "send" } };
  if (cycle.approval === "En revisión") return { stageIndex: 1, next: { title: "Registrar decisión de Subcomisión", desc: "Registra el resultado, la fecha, el número de acta y las observaciones del comité.", action: "decision", label: "Registrar decisión", icon: "gavel" } };
  if (cycle.approval === "Rechazado") return { stageIndex: 2, rejected: true, next: null };
  if (cycle.status !== "Iniciado") return { stageIndex: 3, next: { title: "Iniciar vigencia y asignar presupuesto", desc: "Inicia la vigencia y registra el presupuesto anual en un solo paso. Se asigna una única vez y no podrá modificarse.", action: "start-budget", label: "Iniciar y asignar presupuesto", icon: "play" } };
  if (!cycle.budget) return { stageIndex: 3, next: { title: "Asignar presupuesto", desc: "Registra el presupuesto anual en COP. Se asigna una única vez y no podrá modificarse.", action: "assign-budget", label: "Asignar presupuesto", icon: "wallet" } };
  return { stageIndex: 4, next: { title: "Registrar gasto", desc: "Registra gastos comprometidos o ejecutados. Cada gasto descuenta del saldo disponible de la vigencia.", action: "new-expense", label: "Registrar gasto", icon: "plus" } };
}

export const cycleStages: { label: string; icon: IconName }[] = [
  { label: "Borrador", icon: "pencil" },
  { label: "Revisión", icon: "send" },
  { label: "Aprobación", icon: "gavel" },
  { label: "Presupuesto", icon: "wallet" },
  { label: "Gastos", icon: "coins" },
  { label: "Cierre", icon: "lock" },
];
