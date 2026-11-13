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
/** Tipos de gasto que no llevan orden de pedido ni comprobante (deben coincidir con el backend). */
export const SUPPORT_EXEMPT_TYPES = ["Practicante", "Gestión del recurso humano"];
export const supportExempt = (type: string) => SUPPORT_EXEMPT_TYPES.includes(type);

/** Tipos de gasto que cuentan contra la bolsa de Recurso humano; todos los demás cuentan como Proveedores. */
export const HR_EXPENSE_TYPES = ["Practicante", "Gestión del recurso humano"];
export const isHrType = (type: string) => HR_EXPENSE_TYPES.includes(type);

export interface Bucket { label: string; budget: number; committed: number; executed: number; used: number; available: number }
/** Presupuesto vs. gasto por bolsa; null si la vigencia aún no tiene distribución. */
export function bucketTotals(cycle: { budgetProviders: number | null; budgetHr: number | null; expenses: { type: string; status: ExpenseStatus; value: number }[] }): { providers: Bucket; hr: Bucket } | null {
  if (cycle.budgetProviders === null || cycle.budgetHr === null) return null;
  const make = (label: string, budget: number, hr: boolean): Bucket => {
    const own = cycle.expenses.filter((e) => isHrType(e.type) === hr);
    const committed = own.filter((e) => e.status === "Comprometido").reduce((s, e) => s + e.value, 0);
    const executed = own.filter((e) => e.status === "Ejecutado").reduce((s, e) => s + e.value, 0);
    return { label, budget, committed, executed, used: committed + executed, available: budget - committed - executed };
  };
  return { providers: make("Proveedores", cycle.budgetProviders, false), hr: make("Recurso humano", cycle.budgetHr, true) };
}

export type CycleAction = "submit-review" | "decision" | "start-budget" | "assign-budget" | "new-expense";
export interface CycleStep { title: string; desc: string; action: CycleAction; label: string; icon: IconName }
export interface CycleFlow { stageIndex: number; closed?: boolean; rejected?: boolean; next: CycleStep | null }

/** Determina la etapa activa y la siguiente acción sugerida de una vigencia. */
export function cycleFlow(cycle: CycleLike): CycleFlow {
  if (cycle.closed) return { stageIndex: 5, closed: true, next: null };
  if (cycle.approval === "Borrador") return { stageIndex: 0, next: { title: "Enviar a revisión", desc: "Envía la vigencia a la Subcomisión para su evaluación anual.", action: "submit-review", label: "Enviar a revisión", icon: "send" } };
  if (cycle.approval === "En revisión") return { stageIndex: 1, next: { title: "Aprobar vigencia y asignar presupuesto", desc: "Registra la decisión de la Subcomisión (acta y fecha) y, si se aprueba, el presupuesto anual en el mismo paso.", action: "decision", label: "Aprobar y asignar presupuesto", icon: "gavel" } };
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
