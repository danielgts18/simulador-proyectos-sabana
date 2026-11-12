/**
 * Cliente HTTP del Simulador Presupuestal.
 * Adjunta automáticamente el JWT almacenado en localStorage.
 * Normaliza errores HTTP a { ok: false, message }.
 */

import type { Role, ApprovalStatus, CycleStatus, ExpenseStatus } from "./types";

const BASE_URL = import.meta.env.VITE_API_URL as string ?? "";
const TOKEN_KEY = "avi-poc-jwt";

// ─── Token storage ─────────────────────────────────────────────────────────
export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// ─── Base request ──────────────────────────────────────────────────────────
type ApiOk<T> = { ok: true; data: T };
type ApiErr = { ok: false; message: string };
type ApiResult<T> = ApiOk<T> | ApiErr;

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const token = getToken();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      return { ok: false, message: err.message ?? `Error ${res.status}` };
    }
    const data = await res.json() as T;
    return { ok: true, data };
  } catch (e) {
    return { ok: false, message: (e instanceof Error ? e.message : "Error de red.") };
  }
}

const get = <T>(path: string) => request<T>("GET", path);
const post = <T>(path: string, body?: unknown) => request<T>("POST", path, body);
const put = <T>(path: string, body?: unknown) => request<T>("PUT", path, body);
const patch = <T>(path: string, body?: unknown) => request<T>("PATCH", path, body);
const del = <T>(path: string) => request<T>("DELETE", path);

// ─── Response types (matching backend output) ─────────────────────────────
export interface ApiUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  active?: boolean;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  /** true si el usuario aún no definió su propia contraseña. */
  mustChangePassword?: boolean;
  user: ApiUser;
}

export interface ApiProject {
  id: number;
  name: string;
  gl: string;
  implementationProgressPct: number;
  ecosystem: string;
  leaderUserId: string;
  leaderName: string;
  description: string;
  objective: string;
  start: string | null;
  end: string | null;
  notes: string;
  growthHorizon: string;
  cycles?: ApiCycle[];
}

export interface ApiCycle {
  id: number;
  projectId: number;
  year: number;
  openedAt: string | null;
  approval: ApprovalStatus;
  status: CycleStatus;
  act: string;
  approvalDate: string | null;
  budget: number;
  closed: boolean;
  notes: string;
  progressPct: number;
}

export interface ApiExpense {
  id: number;
  cycleId: number;
  date: string;
  provider: string;
  type: string;
  value: number;
  status: ExpenseStatus;
  order: string;
  receipt: string;
}

export interface ApiExpenseTotals {
  budget: number;
  committed: number;
  executed: number;
  used: number;
  available: number;
}

export interface ApiCatalogs {
  ecosystems: string[];
  expenseTypes: string[];
}

export interface ApiDashboard {
  year: number;
  aggregate: { totalBudget: number; committed: number; executed: number; available: number; overCount: number };
  pendingCycles: Array<{ projectId: number; projectName: string; cycleId: number; year: number; approvalStatus: string; nextAction: string }>;
  rows: Array<{ projectId: number; projectName: string; ecosystem: string; leaderName: string; cycleId: number | null; approvalStatus: string | null; cycleStatus: string | null; budget: number; committed: number; executed: number; available: number; closed: boolean | null }>;
}

// ─── Input types (matching backend expectations) ───────────────────────────
export interface ProjectInput {
  name: string;
  gl: string;
  ecosystem: string;
  leaderUserId: string;
  leaderName: string;
  objective?: string;
  description?: string;
  start?: string;
  end?: string;
  notes?: string;
  growthHorizon?: string;
  year?: number;
}

export interface DecisionInput {
  approval: "Aprobado" | "Rechazado";
  approvalDate: string;
  act: string;
  notes?: string;
}

export interface ExpenseInput {
  month: string;
  provider: string;
  type: string;
  value: number;
  status: ExpenseStatus;
  order?: string;
  receipt?: string;
}

export interface UserInput {
  name: string;
  username: string;
  password?: string;
  role: Role;
}

// ─── API functions ─────────────────────────────────────────────────────────
export const api = {
  // Auth
  login: (username: string, password: string) =>
    post<LoginResponse>("/auth/login", { username, password }),
  me: () => get<ApiUser & { mustChangePassword?: boolean }>("/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    post<LoginResponse>("/auth/change-password", { currentPassword, newPassword }),

  // Dashboard
  dashboard: (year: number, expenseType?: string) =>
    get<ApiDashboard>(`/dashboard?year=${year}${expenseType ? `&expenseType=${encodeURIComponent(expenseType)}` : ""}`),

  // Projects
  listProjects: () => get<ApiProject[]>("/projects"),
  getProject: (id: number) => get<ApiProject>(`/projects/${id}`),
  createProject: (data: ProjectInput) => post<{ projectId: number; cycleId: number }>("/projects", data),
  updateProject: (id: number, data: Omit<ProjectInput, "year">) => put<ApiProject>(`/projects/${id}`, data),
  updateImplementationProgress: (id: number, implementationProgressPct: number) =>
    patch<ApiProject>(`/projects/${id}/implementation-progress`, { implementationProgressPct }),
  deleteProject: (id: number) => del<{ ok: boolean }>(`/projects/${id}`),
  deleteCell: (cellName: string) => del<{ ok: boolean }>(`/projects/cell/${encodeURIComponent(cellName)}`),

  // Cycles
  createCycle: (projectId: number, year: number, notes: string) =>
    post<ApiCycle>(`/projects/${projectId}/cycles`, { year, notes }),
  submitReview: (projectId: number, cycleId: number) =>
    patch<ApiCycle>(`/projects/${projectId}/cycles/${cycleId}/submit`),
  recordDecision: (projectId: number, cycleId: number, data: DecisionInput) =>
    patch<ApiCycle>(`/projects/${projectId}/cycles/${cycleId}/decision`, data),
  assignBudget: (projectId: number, cycleId: number, budget: number) =>
    patch<ApiCycle>(`/projects/${projectId}/cycles/${cycleId}/budget`, { budget }),
  closeCycle: (projectId: number, cycleId: number) =>
    patch<ApiCycle>(`/projects/${projectId}/cycles/${cycleId}/close`),

  // Expenses
  listExpenses: (projectId: number, cycleId: number) =>
    get<{ expenses: ApiExpense[]; totals: ApiExpenseTotals }>(`/projects/${projectId}/cycles/${cycleId}/expenses`),
  saveExpense: (projectId: number, cycleId: number, data: ExpenseInput) =>
    post<ApiExpense>(`/projects/${projectId}/cycles/${cycleId}/expenses`, data),
  updateExpense: (projectId: number, cycleId: number, expenseId: number, data: ExpenseInput) =>
    put<ApiExpense>(`/projects/${projectId}/cycles/${cycleId}/expenses/${expenseId}`, data),
  deleteExpense: (projectId: number, cycleId: number, expenseId: number) =>
    del<{ ok: boolean }>(`/projects/${projectId}/cycles/${cycleId}/expenses/${expenseId}`),
  duplicateExpense: (projectId: number, cycleId: number, expenseId: number) =>
    post<ApiExpense>(`/projects/${projectId}/cycles/${cycleId}/expenses/${expenseId}/duplicate`),

  // Catalogs
  getCatalogs: () => get<ApiCatalogs>("/catalogs"),
  addEcosystem: (name: string) => post<{ ok: boolean }>("/catalogs/ecosystems", { name }),
  deleteEcosystem: (name: string) => del<{ ok: boolean }>(`/catalogs/ecosystems/${encodeURIComponent(name)}`),
  addExpenseType: (name: string) => post<{ ok: boolean }>("/catalogs/expense-types", { name }),
  deleteExpenseType: (name: string) => del<{ ok: boolean }>(`/catalogs/expense-types/${encodeURIComponent(name)}`),

  // Users
  listUsers: () => get<ApiUser[]>("/users"),
  createUser: (data: UserInput) => post<ApiUser>("/users", data),
  updateUser: (id: string, data: UserInput) => put<ApiUser>(`/users/${id}`, data),
  deleteUser: (id: string) => del<{ ok: boolean }>(`/users/${id}`),
  resetUserPassword: (userId: string) =>
    post<{ temporaryPassword: string }>(`/users/${userId}/reset-password`),
  reassignAndDeleteUser: (userId: string, newLeaderId: string) =>
    post<{ ok: boolean }>(`/users/${userId}/reassign`, { newLeaderId }),
};
