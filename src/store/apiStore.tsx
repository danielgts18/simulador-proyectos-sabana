/**
 * API Store — reemplaza el store en memoria con llamadas al backend AWS.
 * Misma interfaz que store.tsx pero con métodos async y user IDs como string (UUID).
 *
 * Para activar: cambiar el import en App.tsx de
 *   "@/store/store"  →  "@/store/apiStore"
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  api,
  saveToken,
  clearToken,
  getToken,
  type ApiProject,
  type ApiCycle,
  type ApiExpense,
  type ApiUser,
  type ProjectInput,
  type DecisionInput,
  type ExpenseInput,
  type UserInput,
} from "@/lib/api";
import type { Role, ApprovalStatus, CycleStatus, ExpenseStatus } from "@/lib/types";

// ─── Tipos de dominio adaptados (id de usuario como string UUID) ────────────

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  active: boolean;
}

export interface Expense {
  id: number;
  date: string;
  provider: string;
  type: string;
  value: number;
  status: ExpenseStatus;
  order: string;
  receipt: string;
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
  notes: string;
  progressPct: number;
  expenses: Expense[];
}

export interface Project {
  id: number;
  name: string;
  gl: string;
  ecosystem: string;
  leader: string;
  leaderUserId: string;
  description: string;
  objective: string;
  start: string | null;
  end: string | null;
  notes: string;
  growthHorizon: string;
  cycles: Cycle[];
}

type Result = { ok: boolean; message?: string };

// ─── Contexto ───────────────────────────────────────────────────────────────

interface Store {
  // Estado de carga
  loading: boolean;
  // Rehidratación de sesión al montar (mientras se valida el JWT guardado)
  hydrating: boolean;
  // Auth
  activeUser: User | null;
  isJefatura: boolean;
  canManagePortfolio: boolean;
  login: (username: string, password: string) => Promise<Result>;
  logout: () => void;
  // Config
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  ecosystems: string[];
  expenseTypes: string[];
  users: User[];
  // Datos
  projects: Project[];
  accessibleProjects: () => Project[];
  getProject: (id: number) => Project | undefined;
  getCycle: (project: Project | undefined, cycleId: number) => Cycle | undefined;
  fetchProjectDetail: (id: number) => Promise<Project | null>;
  canManageExpenses: (project: Project) => boolean;
  // Proyectos
  createProject: (data: ProjectInput, year: number) => Promise<{ ok: boolean; projectId?: number; cycleId?: number; message?: string }>;
  updateProject: (id: number, data: Omit<ProjectInput, "year">) => Promise<Result>;
  deleteProject: (id: number) => Promise<Result>;
  deleteCell: (name: string) => Promise<Result>;
  // Vigencias
  createCycle: (projectId: number, year: number, notes: string) => Promise<Result>;
  submitReview: (projectId: number, cycleId: number) => Promise<void>;
  recordDecision: (projectId: number, cycleId: number, data: DecisionInput) => Promise<void>;
  assignBudget: (projectId: number, cycleId: number, budget: number) => Promise<void>;
  updateProgress: (projectId: number, cycleId: number, progressPct: number) => Promise<Result>;
  closeCycle: (projectId: number, cycleId: number) => Promise<void>;
  // Gastos
  saveExpense: (projectId: number, cycleId: number, expenseId: number | null, data: ExpenseInput) => Promise<Result>;
  duplicateExpense: (projectId: number, cycleId: number, expenseId: number) => Promise<void>;
  deleteExpense: (projectId: number, cycleId: number, expenseId: number) => Promise<void>;
  // Catálogos
  addCatalog: (type: "ecosystems" | "expenseTypes", name: string) => Promise<void>;
  deactivateCatalog: (type: "ecosystems" | "expenseTypes", item: string) => Promise<void>;
  // Usuarios
  createUser: (data: UserInput) => Promise<Result>;
  updateUser: (id: string, data: UserInput) => Promise<Result>;
  deleteUser: (id: string) => Promise<Result>;
  reassignAndDeleteUser: (userId: string, newLeaderId: string) => Promise<Result>;
}

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const YEAR_KEY = "avi-poc-year";

function mapUser(u: ApiUser): User {
  return { id: u.id, name: u.name, username: u.username, role: u.role, active: u.active ?? true };
}

function mapExpense(e: ApiExpense): Expense {
  return { id: e.id, date: e.date, provider: e.provider, type: e.type, value: e.value, status: e.status, order: e.order, receipt: e.receipt ?? "" };
}

function mapCycle(c: ApiCycle): Cycle {
  return { id: c.id, year: c.year, openedAt: c.openedAt ?? "", approval: c.approval, status: c.status, act: c.act ?? "", approvalDate: c.approvalDate ?? "", budget: c.budget, closed: c.closed, notes: c.notes ?? "", progressPct: c.progressPct ?? 0, expenses: [] };
}

function mapProject(p: ApiProject): Project {
  return { id: p.id, name: p.name, gl: p.gl, ecosystem: p.ecosystem, leader: p.leaderName, leaderUserId: p.leaderUserId, description: p.description, objective: p.objective, start: p.start, end: p.end, notes: p.notes, growthHorizon: p.growthHorizon ?? "", cycles: (p.cycles ?? []).map(mapCycle) };
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [ecosystems, setEcosystems] = useState<string[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedYear, setSelectedYearState] = useState<string>(() => localStorage.getItem(YEAR_KEY) ?? String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  // Si hay un JWT guardado, arrancamos en modo "hidratando" para no redirigir al login
  // antes de validar la sesión contra /auth/me tras recargar la página.
  const [hydrating, setHydrating] = useState<boolean>(() => Boolean(getToken()));

  // Cache de proyectos con detalle completo (vigencias + gastos)
  const detailCacheRef = useRef<Map<number, Project>>(new Map());

  const setSelectedYear = useCallback((year: string) => {
    localStorage.setItem(YEAR_KEY, year);
    setSelectedYearState(year);
  }, []);

  // ─── Carga inicial de datos ───────────────────────────────────────────────

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [projectsRes, catalogsRes] = await Promise.all([
        api.listProjects(),
        api.getCatalogs(),
      ]);
      if (projectsRes.ok) setProjects(projectsRes.data.map(mapProject));
      if (catalogsRes.ok) {
        setEcosystems(catalogsRes.data.ecosystems);
        setExpenseTypes(catalogsRes.data.expenseTypes);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Rehidratación de sesión al recargar la página ─────────────────────────
  useEffect(() => {
    if (!getToken()) { setHydrating(false); return; }
    let cancelled = false;
    void (async () => {
      const res = await api.me();
      if (cancelled) return;
      if (res.ok) {
        setActiveUser(mapUser(res.data));
        await loadInitialData();
      } else {
        clearToken();
      }
      if (!cancelled) setHydrating(false);
    })();
    return () => { cancelled = true; };
  }, [loadInitialData]);

  // ─── Auth ─────────────────────────────────────────────────────────────────

  const login = useCallback(async (username: string, password: string): Promise<Result> => {
    const res = await api.login(username, password);
    if (!res.ok) return res;
    saveToken(res.data.token);
    setActiveUser(mapUser(res.data.user));
    await loadInitialData();
    return { ok: true };
  }, [loadInitialData]);

  const logout = useCallback(() => {
    clearToken();
    setActiveUser(null);
    setProjects([]);
    setUsers([]);
    detailCacheRef.current.clear();
  }, []);

  // ─── Computed ─────────────────────────────────────────────────────────────

  const isJefatura = activeUser?.role === "JEFATURA";
  const canManagePortfolio = activeUser?.role !== "LIDER_PROYECTO";

  const canManageExpenses = useCallback(
    (project: Project) =>
      activeUser?.role === "JEFATURA" ||
      (activeUser?.role === "LIDER_PROYECTO" && project.leaderUserId === activeUser?.id),
    [activeUser],
  );

  const accessibleProjects = useCallback(
    () =>
      activeUser?.role === "LIDER_PROYECTO"
        ? projects.filter((p) => p.leaderUserId === activeUser.id)
        : projects,
    [activeUser, projects],
  );

  const getProject = useCallback(
    (id: number): Project | undefined =>
      detailCacheRef.current.get(id) ?? projects.find((p) => p.id === id),
    [projects],
  );

  const getCycle = useCallback(
    (project: Project | undefined, cycleId: number): Cycle | undefined =>
      project?.cycles.find((c) => c.id === cycleId),
    [],
  );

  const fetchProjectDetail = useCallback(async (id: number): Promise<Project | null> => {
    const res = await api.getProject(id);
    if (!res.ok) return null;
    const proj = mapProject(res.data);
    // Cargar gastos de cada vigencia en paralelo (PoC: N vigencias por proyecto es bajo)
    if (proj.cycles.length > 0) {
      const expenseResults = await Promise.all(proj.cycles.map(c => api.listExpenses(id, c.id)));
      expenseResults.forEach((r, i) => {
        if (r.ok) proj.cycles[i].expenses = r.data.expenses.map(mapExpense);
      });
    }
    detailCacheRef.current.set(id, proj);
    setProjects((prev) => prev.map((p) => (p.id === id ? proj : p)));
    return proj;
  }, []);

  // ─── Proyectos ────────────────────────────────────────────────────────────

  const createProject = useCallback(async (data: ProjectInput, year: number) => {
    const res = await api.createProject({ ...data, year });
    if (!res.ok) return res;
    await loadInitialData();
    return { ok: true, projectId: res.data.projectId, cycleId: res.data.cycleId };
  }, [loadInitialData]);

  const updateProject = useCallback(async (id: number, data: Omit<ProjectInput, "year">) => {
    const res = await api.updateProject(id, data);
    if (!res.ok) return res;
    // Recarga el detalle completo (vigencias + gastos) para no perder las vigencias
    // ya cargadas ni romper la identidad del objeto en caché/estado.
    await fetchProjectDetail(id);
    return { ok: true };
  }, [fetchProjectDetail]);

  const deleteProject = useCallback(async (id: number) => {
    const res = await api.deleteProject(id);
    if (!res.ok) return res;
    detailCacheRef.current.delete(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    return { ok: true };
  }, []);

  const deleteCell = useCallback(async (name: string) => {
    const res = await api.deleteCell(name);
    if (!res.ok) return res;
    setProjects((prev) => prev.filter((p) => p.ecosystem !== name));
    setEcosystems((prev) => prev.filter((e) => e !== name));
    return { ok: true };
  }, []);

  // ─── Vigencias ────────────────────────────────────────────────────────────

  const updateCycleInState = useCallback((projectId: number, updatedCycle: ApiCycle) => {
    const mapped = mapCycle(updatedCycle);
    const updateFn = (p: Project): Project =>
      p.id !== projectId ? p : { ...p, cycles: p.cycles.map((c) => (c.id === updatedCycle.id ? { ...mapped, expenses: c.expenses } : c)) };
    setProjects((prev) => prev.map(updateFn));
    const cached = detailCacheRef.current.get(projectId);
    if (cached) detailCacheRef.current.set(projectId, updateFn(cached));
  }, []);

  const createCycle = useCallback(async (projectId: number, year: number, notes: string) => {
    const res = await api.createCycle(projectId, year, notes);
    if (!res.ok) return res;
    const newCycle = { ...mapCycle(res.data), expenses: [] };
    const addCycle = (p: Project) => p.id !== projectId ? p : { ...p, cycles: [...p.cycles, newCycle] };
    setProjects((prev) => prev.map(addCycle));
    const cached = detailCacheRef.current.get(projectId);
    if (cached) detailCacheRef.current.set(projectId, addCycle(cached));
    return { ok: true };
  }, []);

  const submitReview = useCallback(async (projectId: number, cycleId: number) => {
    const res = await api.submitReview(projectId, cycleId);
    if (res.ok) updateCycleInState(projectId, res.data);
  }, [updateCycleInState]);

  const recordDecision = useCallback(async (projectId: number, cycleId: number, data: DecisionInput) => {
    const res = await api.recordDecision(projectId, cycleId, data);
    if (res.ok) updateCycleInState(projectId, res.data);
  }, [updateCycleInState]);

  const assignBudget = useCallback(async (projectId: number, cycleId: number, budget: number) => {
    const res = await api.assignBudget(projectId, cycleId, budget);
    if (res.ok) updateCycleInState(projectId, res.data);
  }, [updateCycleInState]);

  const updateProgress = useCallback(async (projectId: number, cycleId: number, progressPct: number): Promise<Result> => {
    const res = await api.updateProgress(projectId, cycleId, progressPct);
    if (!res.ok) return res;
    updateCycleInState(projectId, res.data);
    return { ok: true };
  }, [updateCycleInState]);

  const closeCycle = useCallback(async (projectId: number, cycleId: number) => {
    const res = await api.closeCycle(projectId, cycleId);
    if (res.ok) updateCycleInState(projectId, res.data);
  }, [updateCycleInState]);

  // ─── Gastos ───────────────────────────────────────────────────────────────

  const refreshExpenses = useCallback(async (projectId: number, cycleId: number) => {
    const res = await api.listExpenses(projectId, cycleId);
    if (!res.ok) return;
    const expenses = res.data.expenses.map(mapExpense);
    const updateFn = (p: Project) =>
      p.id !== projectId ? p : { ...p, cycles: p.cycles.map((c) => c.id === cycleId ? { ...c, expenses } : c) };
    setProjects((prev) => prev.map(updateFn));
    const cached = detailCacheRef.current.get(projectId);
    if (cached) detailCacheRef.current.set(projectId, updateFn(cached));
  }, []);

  const saveExpense = useCallback(async (projectId: number, cycleId: number, expenseId: number | null, data: ExpenseInput) => {
    const res = expenseId === null
      ? await api.saveExpense(projectId, cycleId, data)
      : await api.updateExpense(projectId, cycleId, expenseId, data);
    if (!res.ok) return res;
    await refreshExpenses(projectId, cycleId);
    return { ok: true };
  }, [refreshExpenses]);

  const duplicateExpense = useCallback(async (projectId: number, cycleId: number, expenseId: number) => {
    await api.duplicateExpense(projectId, cycleId, expenseId);
    await refreshExpenses(projectId, cycleId);
  }, [refreshExpenses]);

  const deleteExpense = useCallback(async (projectId: number, cycleId: number, expenseId: number) => {
    await api.deleteExpense(projectId, cycleId, expenseId);
    const removeExpense = (p: Project) =>
      p.id !== projectId ? p : { ...p, cycles: p.cycles.map((c) => c.id === cycleId ? { ...c, expenses: c.expenses.filter((e) => e.id !== expenseId) } : c) };
    setProjects((prev) => prev.map(removeExpense));
    const cached = detailCacheRef.current.get(projectId);
    if (cached) detailCacheRef.current.set(projectId, removeExpense(cached));
  }, []);

  // ─── Catálogos ────────────────────────────────────────────────────────────

  const addCatalog = useCallback(async (type: "ecosystems" | "expenseTypes", name: string) => {
    if (type === "ecosystems") {
      await api.addEcosystem(name);
      setEcosystems((prev) => prev.includes(name) ? prev : [...prev, name]);
    } else {
      await api.addExpenseType(name);
      setExpenseTypes((prev) => prev.includes(name) ? prev : [...prev, name]);
    }
  }, []);

  const deactivateCatalog = useCallback(async (type: "ecosystems" | "expenseTypes", item: string) => {
    if (type === "ecosystems") {
      await api.deleteEcosystem(item);
      setEcosystems((prev) => prev.filter((e) => e !== item));
    } else {
      await api.deleteExpenseType(item);
      setExpenseTypes((prev) => prev.filter((e) => e !== item));
    }
  }, []);

  // ─── Usuarios ─────────────────────────────────────────────────────────────

  const refreshUsers = useCallback(async () => {
    const res = await api.listUsers();
    if (res.ok) setUsers(res.data.map(mapUser));
  }, []);

  // Carga usuarios cuando se accede a /users por primera vez
  useEffect(() => {
    if (activeUser && (isJefatura || activeUser.role === "GESTOR_FINANCIERO")) {
      void refreshUsers();
    }
  }, [activeUser, isJefatura, refreshUsers]);

  const createUser = useCallback(async (data: UserInput) => {
    const res = await api.createUser(data);
    if (!res.ok) return res;
    await refreshUsers();
    return { ok: true };
  }, [refreshUsers]);

  const updateUser = useCallback(async (id: string, data: UserInput) => {
    const res = await api.updateUser(id, data);
    if (!res.ok) return res;
    await refreshUsers();
    return { ok: true };
  }, [refreshUsers]);

  const deleteUser = useCallback(async (id: string) => {
    const res = await api.deleteUser(id);
    if (!res.ok) return res;
    setUsers((prev) => prev.filter((u) => u.id !== id));
    return { ok: true };
  }, []);

  const reassignAndDeleteUser = useCallback(async (userId: string, newLeaderId: string) => {
    const res = await api.reassignAndDeleteUser(userId, newLeaderId);
    if (!res.ok) return res;
    await Promise.all([refreshUsers(), loadInitialData()]);
    return { ok: true };
  }, [refreshUsers, loadInitialData]);

  const store: Store = {
    loading,
    hydrating,
    activeUser,
    isJefatura,
    canManagePortfolio,
    login,
    logout,
    selectedYear,
    setSelectedYear,
    ecosystems,
    expenseTypes,
    users,
    projects,
    accessibleProjects,
    getProject,
    getCycle,
    fetchProjectDetail,
    canManageExpenses,
    createProject,
    updateProject,
    deleteProject,
    deleteCell,
    createCycle,
    submitReview,
    recordDecision,
    assignBudget,
    updateProgress,
    closeCycle,
    saveExpense,
    duplicateExpense,
    deleteExpense,
    addCatalog,
    deactivateCatalog,
    createUser,
    updateUser,
    deleteUser,
    reassignAndDeleteUser,
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
