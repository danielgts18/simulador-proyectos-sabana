/* =========================================================================
   Modelo de dominio · Seguimiento presupuestal
   Fiel al prototipo estático (web/): estados en español, estado en memoria.
   ========================================================================= */

export type Role = "JEFATURA" | "GESTOR_FINANCIERO" | "LIDER_PROYECTO";

export type ApprovalStatus = "Borrador" | "En revisión" | "Aprobado" | "Rechazado";
export type CycleStatus = "Borrador" | "Iniciado" | "Cerrado";
export type ExpenseStatus = "Comprometido" | "Ejecutado";

export interface User {
  id: number;
  name: string;
  username: string;
  password: string;
  role: Role;
  active: boolean;
}

export interface Expense {
  id: number;
  date: string;          // "YYYY-MM-DD"
  provider: string;
  type: string;
  value: number;
  status: ExpenseStatus;
  order: string;
}

export interface Cycle {
  id: number;
  year: number;
  openedAt: string;
  approval: ApprovalStatus;
  status: CycleStatus;
  act: string;
  approvalDate: string;
  budget: number;
  closed: boolean;
  notes?: string;
  expenses: Expense[];
}

export interface Project {
  id: number;
  name: string;
  ecosystem: string;
  leader: string;
  leaderUserId: number;
  description: string;
  objective: string;
  start: string;
  end: string;
  notes: string;
  cycles: Cycle[];
}

/** Datos persistibles del simulador (lo que se guarda en localStorage). */
export interface AppData {
  users: User[];
  activeUserId: number | null;
  ecosystems: string[];
  expenseTypes: string[];
  projects: Project[];
  selectedYear: string;
}

export const roleLabels: Record<Role, string> = {
  JEFATURA: "Jefatura",
  GESTOR_FINANCIERO: "Gestor financiero",
  LIDER_PROYECTO: "Líder de proyecto",
};
