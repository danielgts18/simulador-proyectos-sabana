/**
 * API Store — estado global de la app conectado al backend AWS.
 * Las acciones devuelven Result: la UI solo confirma éxito cuando el servidor aceptó el cambio.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  api,
  saveToken,
  clearToken,
  getToken,
  AUTH_EXPIRED_EVENT,
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
  implementationProgressPct: number;
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

/** Resultado de cargar el detalle de un proyecto; status permite distinguir 403/404 de un fallo de red. */
export type DetailResult = { ok: true; project: Project } | { ok: false; status?: number; message: string };

// ─── Contexto ───────────────────────────────────────────────────────────────

interface Store {
  // Estado de carga
  loading: boolean;
  /** Error al cargar proyectos/catálogos (null si la última carga fue correcta). */
  loadError: string | null;
  reloadData: () => Promise<void>;
  /** Aviso para la pantalla de acceso (p. ej. sesión expirada). */
  sessionNotice: string | null;
  // Rehidratación de sesión al montar (mientras se valida el JWT guardado)
  hydrating: boolean;
  // Auth
  activeUser: User | null;
  isJefatura: boolean; // incluye al administrador
  canManagePortfolio: boolean;
  /** Solo el gestor financiero crea, modifica y elimina proyectos y gestiona sus vigencias. */
  canManageProjects: boolean;
  login: (username: string, password: string) => Promise<Result>;
  /** El usuario debe definir una contraseña propia antes de usar la app. */
  mustChangePassword: boolean;
  changePassword: (currentPassword: string, newPassword: string) => Promise<Result>;
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
  fetchProjectDetail: (id: number) => Promise<DetailResult>;
  canManageExpenses: (project: Project) => boolean;
  // Proyectos
  createProject: (data: ProjectInput, year: number) => Promise<{ ok: boolean; projectId?: number; cycleId?: number; message?: string }>;
  updateProject: (id: number, data: Omit<ProjectInput, "year">) => Promise<Result>;
  deleteProject: (id: number) => Promise<Result>;
  deleteCell: (name: string) => Promise<Result>;
  // Vigencias
  createCycle: (projectId: number, year: number, notes: string) => Promise<Result>;
  submitReview: (projectId: number, cycleId: number) => Promise<Result>;
  recordDecision: (projectId: number, cycleId: number, data: DecisionInput) => Promise<Result>;
  assignBudget: (projectId: number, cycleId: number, budget: number) => Promise<Result>;
  updateImplementationProgress: (projectId: number, implementationProgressPct: number) => Promise<Result>;
  closeCycle: (projectId: number, cycleId: number) => Promise<Result>;
  // Gastos
  saveExpense: (projectId: number, cycleId: number, expenseId: number | null, data: ExpenseInput) => Promise<Result>;
  deleteExpense: (projectId: number, cycleId: number, expenseId: number) => Promise<Result>;
  // Catálogos
  addCatalog: (type: "ecosystems" | "expenseTypes", name: string) => Promise<Result>;
  deactivateCatalog: (type: "ecosystems" | "expenseTypes", item: string) => Promise<Result>;
  // Usuarios
  createUser: (data: UserInput) => Promise<Result>;
  updateUser: (id: string, data: UserInput) => Promise<Result>;
  deleteUser: (id: string) => Promise<Result>;
  /** Restablece la contraseña y devuelve la temporal (se muestra una sola vez). */
  resetUserPassword: (userId: string) => Promise<{ ok: true; temporaryPassword: string } | { ok: false; message: string }>;
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
  return { id: p.id, name: p.name, gl: p.gl, implementationProgressPct: p.implementationProgressPct ?? 0, ecosystem: p.ecosystem, leader: p.leaderName, leaderUserId: p.leaderUserId, description: p.description, objective: p.objective, start: p.start, end: p.end, notes: p.notes, growthHorizon: p.growthHorizon ?? "", cycles: (p.cycles ?? []).map(mapCycle) };
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
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

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
      // La lista recargada reemplaza los detalles en caché (líder, nombre, etc. pueden haber cambiado).
      detailCacheRef.current.clear();
      if (projectsRes.ok) setProjects(projectsRes.data.map(mapProject));
      if (catalogsRes.ok) {
        setEcosystems(catalogsRes.data.ecosystems);
        setExpenseTypes(catalogsRes.data.expenseTypes);
      }
      const failed = !projectsRes.ok ? projectsRes : !catalogsRes.ok ? catalogsRes : null;
      setLoadError(failed ? failed.message : null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Cierre de sesión ─────────────────────────────────────────────────────

  const logout = useCallback(() => {
    clearToken();
    setActiveUser(null);
    setMustChangePassword(false);
    setProjects([]);
    setUsers([]);
    setLoadError(null);
    detailCacheRef.current.clear();
  }, []);

  // El cliente HTTP avisa cuando el servidor rechaza el token (sesión vencida).
  useEffect(() => {
    const onExpired = () => {
      logout();
      setSessionNotice("Tu sesión expiró. Ingresa de nuevo.");
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [logout]);

  // ─── Rehidratación de sesión al recargar la página ─────────────────────────
  useEffect(() => {
    if (!getToken()) { setHydrating(false); return; }
    let cancelled = false;
    void (async () => {
      const res = await api.me();
      if (cancelled) return;
      if (res.ok) {
        setActiveUser(mapUser(res.data));
        if (res.data.mustChangePassword) setMustChangePassword(true);
        else await loadInitialData();
      } else if (res.status === 401 || res.status === 403) {
        clearToken();
      } else {
        // Fallo de red o del servidor: se conserva el token para reintentar al recargar la página.
        setSessionNotice(`${res.message} Recarga la página para reintentar.`);
      }
      if (!cancelled) setHydrating(false);
    })();
    return () => { cancelled = true; };
  }, [loadInitialData]);

  // ─── Auth ─────────────────────────────────────────────────────────────────

  const login = useCallback(async (username: string, password: string): Promise<Result> => {
    const res = await api.login(username, password);
    if (!res.ok) return res;
    setSessionNotice(null);
    saveToken(res.data.token);
    setActiveUser(mapUser(res.data.user));
    // Con cambio de contraseña pendiente el servidor solo acepta /auth/me y /auth/change-password.
    if (res.data.mustChangePassword) setMustChangePassword(true);
    else await loadInitialData();
    return { ok: true };
  }, [loadInitialData]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<Result> => {
    const res = await api.changePassword(currentPassword, newPassword);
    if (!res.ok) return res;
    saveToken(res.data.token);
    setActiveUser(mapUser(res.data.user));
    setMustChangePassword(false);
    await loadInitialData();
    return { ok: true };
  }, [loadInitialData]);

  // ─── Computed ─────────────────────────────────────────────────────────────

  const isAdmin = activeUser?.role === "ADMIN";
  const isJefatura = activeUser?.role === "JEFATURA" || isAdmin;
  const canManagePortfolio = activeUser?.role !== "LIDER_PROYECTO";
  const canManageProjects = activeUser?.role === "GESTOR_FINANCIERO" || isAdmin;

  const canManageExpenses = useCallback(
    (project: Project) =>
      activeUser?.role === "ADMIN" ||
      activeUser?.role === "JEFATURA" ||
      activeUser?.role === "GESTOR_FINANCIERO" ||
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

  const fetchProjectDetail = useCallback(async (id: number): Promise<DetailResult> => {
    const res = await api.getProject(id);
    if (!res.ok) return { ok: false, status: res.status, message: res.message };
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
    return { ok: true, project: proj };
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

  const submitReview = useCallback(async (projectId: number, cycleId: number): Promise<Result> => {
    const res = await api.submitReview(projectId, cycleId);
    if (!res.ok) return res;
    updateCycleInState(projectId, res.data);
    return { ok: true };
  }, [updateCycleInState]);

  const recordDecision = useCallback(async (projectId: number, cycleId: number, data: DecisionInput): Promise<Result> => {
    const res = await api.recordDecision(projectId, cycleId, data);
    if (!res.ok) return res;
    updateCycleInState(projectId, res.data);
    return { ok: true };
  }, [updateCycleInState]);

  const assignBudget = useCallback(async (projectId: number, cycleId: number, budget: number): Promise<Result> => {
    const res = await api.assignBudget(projectId, cycleId, budget);
    if (!res.ok) return res;
    updateCycleInState(projectId, res.data);
    return { ok: true };
  }, [updateCycleInState]);

  const updateImplementationProgress = useCallback(async (projectId: number, implementationProgressPct: number): Promise<Result> => {
    const res = await api.updateImplementationProgress(projectId, implementationProgressPct);
    if (!res.ok) return res;
    const updatedProject = mapProject(res.data);
    setProjects((prev) => prev.map((project) => project.id === projectId ? { ...updatedProject, cycles: project.cycles } : project));
    const cached = detailCacheRef.current.get(projectId);
    if (cached) detailCacheRef.current.set(projectId, { ...updatedProject, cycles: cached.cycles });
    return { ok: true };
  }, []);

  const closeCycle = useCallback(async (projectId: number, cycleId: number): Promise<Result> => {
    const res = await api.closeCycle(projectId, cycleId);
    if (!res.ok) return res;
    updateCycleInState(projectId, res.data);
    return { ok: true };
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

  const deleteExpense = useCallback(async (projectId: number, cycleId: number, expenseId: number): Promise<Result> => {
    const res = await api.deleteExpense(projectId, cycleId, expenseId);
    if (!res.ok) return res;
    const removeExpense = (p: Project) =>
      p.id !== projectId ? p : { ...p, cycles: p.cycles.map((c) => c.id === cycleId ? { ...c, expenses: c.expenses.filter((e) => e.id !== expenseId) } : c) };
    setProjects((prev) => prev.map(removeExpense));
    const cached = detailCacheRef.current.get(projectId);
    if (cached) detailCacheRef.current.set(projectId, removeExpense(cached));
    return { ok: true };
  }, []);

  // ─── Catálogos ────────────────────────────────────────────────────────────

  const addCatalog = useCallback(async (type: "ecosystems" | "expenseTypes", name: string): Promise<Result> => {
    const res = type === "ecosystems" ? await api.addEcosystem(name) : await api.addExpenseType(name);
    if (!res.ok) return res;
    const setter = type === "ecosystems" ? setEcosystems : setExpenseTypes;
    setter((prev) => prev.includes(name) ? prev : [...prev, name]);
    return { ok: true };
  }, []);

  const deactivateCatalog = useCallback(async (type: "ecosystems" | "expenseTypes", item: string): Promise<Result> => {
    const res = type === "ecosystems" ? await api.deleteEcosystem(item) : await api.deleteExpenseType(item);
    if (!res.ok) return res;
    const setter = type === "ecosystems" ? setEcosystems : setExpenseTypes;
    setter((prev) => prev.filter((e) => e !== item));
    return { ok: true };
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
    // Si el usuario se corrige a sí mismo, el encabezado debe reflejar el cambio sin recargar.
    setActiveUser((prev) => prev && prev.id === id ? { ...prev, name: data.name.trim(), username: data.username.toLowerCase().trim(), role: data.role } : prev);
    await refreshUsers();
    return { ok: true };
  }, [refreshUsers]);

  const deleteUser = useCallback(async (id: string) => {
    const res = await api.deleteUser(id);
    if (!res.ok) return res;
    setUsers((prev) => prev.filter((u) => u.id !== id));
    return { ok: true };
  }, []);

  const resetUserPassword = useCallback(async (userId: string) => {
    const res = await api.resetUserPassword(userId);
    if (!res.ok) return res;
    return { ok: true as const, temporaryPassword: res.data.temporaryPassword };
  }, []);

  const reassignAndDeleteUser = useCallback(async (userId: string, newLeaderId: string) => {
    const res = await api.reassignAndDeleteUser(userId, newLeaderId);
    if (!res.ok) return res;
    await Promise.all([refreshUsers(), loadInitialData()]);
    return { ok: true };
  }, [refreshUsers, loadInitialData]);

  const store: Store = {
    loading,
    loadError,
    reloadData: loadInitialData,
    sessionNotice,
    hydrating,
    activeUser,
    isJefatura,
    canManagePortfolio,
    canManageProjects,
    login,
    mustChangePassword,
    changePassword,
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
    updateImplementationProgress,
    closeCycle,
    saveExpense,
    deleteExpense,
    addCatalog,
    deactivateCatalog,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    reassignAndDeleteUser,
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
