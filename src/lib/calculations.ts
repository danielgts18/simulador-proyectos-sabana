/* =========================================================================
   Lógica de negocio (cálculos) · Seguimiento presupuestal
   Portada del prototipo estático (web/app.js). Funciones puras sobre datos.
   ========================================================================= */
import type { IconName } from "@/components/icons";
import type { ApprovalStatus, CycleStatus, ExpenseStatus } from "@/lib/types";

// Interfaces mínimas para que las funciones de cálculo sean compatibles con ambos stores.
interface CycleLike {
  closed: boolean;
  approval: ApprovalStatus;
  status: CycleStatus;
  budget: number;
  year?: number;
  expenses: { status: ExpenseStatus; value: number }[];
}
interface ProjectLike { cycles: CycleLike[] }

export interface Totals { committed: number; executed: number; used: number; available: number }

export function expenseTotals(cycle: CycleLike): Totals {
  const committed = cycle.expenses.filter((e) => e.status === "Comprometido").reduce((sum, e) => sum + e.value, 0);
  const executed = cycle.expenses.filter((e) => e.status === "Ejecutado").reduce((sum, e) => sum + e.value, 0);
  return { committed, executed, used: committed + executed, available: (cycle.budget || 0) - committed - executed };
}

export function latestCycle(project: ProjectLike): CycleLike | null {
  return [...project.cycles].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))[0] || null;
}

export interface ProjectSnapshot extends Totals {
  cycle: CycleLike | null;
  budget: number;
  isOver: boolean;
}

/** Agregado presupuestal de un proyecto según la vigencia seleccionada (o su última vigencia). */
export function projectSnapshot(project: ProjectLike, selectedYear: string): ProjectSnapshot {
  const preferred = project.cycles.find((cycle) => String(cycle.year) === selectedYear);
  const cycle = preferred || latestCycle(project);
  const values: Totals = cycle ? expenseTotals(cycle) : { committed: 0, executed: 0, used: 0, available: 0 };
  return { cycle, budget: cycle?.budget || 0, ...values, isOver: cycle ? values.available < 0 : false };
}

export interface CellSummary {
  name: string;
  projects: ProjectLike[];
  count: number;
  budget: number;
  committed: number;
  executed: number;
  used: number;
  available: number;
  over: number;
  activeCycles: number;
}

/** Métricas agregadas de una célula (lista de proyectos ya filtrada) sobre la vigencia seleccionada. */
export function cellSummary(name: string, projects: ProjectLike[], selectedYear: string): CellSummary {
  let budget = 0, committed = 0, executed = 0, over = 0, activeCycles = 0;
  for (const project of projects) {
    const snap = projectSnapshot(project, selectedYear);
    budget += snap.budget; committed += snap.committed; executed += snap.executed;
    if (snap.isOver) over += 1;
    if (snap.cycle && !snap.cycle.closed) activeCycles += 1;
  }
  return { name, projects, count: projects.length, budget, committed, executed, used: committed + executed, available: budget - committed - executed, over, activeCycles };
}

export function availableYears(projects: ProjectLike[]): number[] {
  const years = new Set(projects.flatMap((project) => project.cycles.map((cycle) => cycle.year)));
  return [...years].filter((y): y is number => y !== undefined).sort((a, b) => b - a);
}

/** Mapea el estado (en español) a la clase de color del sistema de diseño. */
export function statusClass(value: string): string {
  const classes: Record<string, string> = {
    "Borrador": "draft", "En revisión": "review", "Aprobado": "approved", "Rechazado": "rejected",
    "Iniciado": "started", "Cerrado": "closed", "Comprometido": "committed", "Ejecutado": "executed", "Sobreejecución": "over",
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
