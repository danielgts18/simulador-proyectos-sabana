/* =========================================================================
   Store en memoria + persistencia local · Seguimiento presupuestal
   Concentra el estado y toda la lógica de negocio portada de web/app.js.
   Expuesto vía Context; los componentes consumen useStore().
   ========================================================================= */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppData, Cycle, ExpenseStatus, Project, Role, User } from "@/lib/types";
import { demoData } from "@/lib/seed";
import { expenseTotals } from "@/lib/calculations";
import { newId } from "@/lib/ids";

const STORAGE_KEY = "usabana-seguimiento-presupuestal/v2";

export type Result = { ok: boolean; message?: string };

/* ---- Carga y normalización -------------------------------------------- */
function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && Array.isArray(parsed.projects) && Array.isArray(parsed.ecosystems) && Array.isArray(parsed.expenseTypes)) {
        return normalize(parsed);
      }
    }
  } catch (error) { console.warn("No se pudo leer el avance guardado:", error); }
  return normalize(demoData());
}

/* Asegura que cada proyecto tenga un usuario líder asociado (líderes heredados). */
function normalize(data: AppData): AppData {
  const next: AppData = structuredClone(data);
  next.users = next.users ?? [];
  next.projects.forEach((project) => {
    let leader = next.users.find((user) => user.id === Number(project.leaderUserId))
      || next.users.find((user) => user.name === project.leader && user.role === "LIDER_PROYECTO");
    if (!leader) {
      const username = project.leader.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
      leader = { id: newId(), name: project.leader, username, password: "Sabana2026!", role: "LIDER_PROYECTO", active: true };
      next.users.push(leader);
    }
    project.leaderUserId = leader.id;
  });
  return next;
}

/* ---- Tipos de la API del store ---------------------------------------- */
export interface ProjectInput {
  name: string; ecosystem: string; leaderUserId: number; objective: string;
  start: string; end: string; description: string; notes: string;
}
export interface DecisionInput { approval: "Aprobado" | "Rechazado"; approvalDate: string; act: string; notes: string }
export interface ExpenseInput { month: string; provider: string; type: string; value: number; status: ExpenseStatus; order: string }
export interface UserInput { name: string; username: string; password?: string; role: Role }

export interface Store {
  state: AppData;
  // Sesión / permisos
  activeUser: User | null;
  isJefatura: boolean;
  canManagePortfolio: boolean;
  canManageExpenses: (project: Project) => boolean;
  accessibleProjects: () => Project[];
  getProject: (id: number) => Project | undefined;
  getCycle: (project: Project | undefined, id: number) => Cycle | undefined;
  // Auth
  login: (username: string, password: string) => Result;
  logout: () => void;
  // Preferencias
  setSelectedYear: (year: string) => void;
  resetData: () => void;
  // Portafolio
  createProject: (data: ProjectInput, year: number) => { ok: boolean; projectId?: number; cycleId?: number };
  updateProject: (id: number, data: ProjectInput) => Result;
  deleteProject: (id: number) => Result;
  deleteCell: (name: string) => Result;
  createCycle: (projectId: number, year: number, notes: string) => Result;
  submitReview: (projectId: number, cycleId: number) => void;
  recordDecision: (projectId: number, cycleId: number, data: DecisionInput) => void;
  assignBudget: (projectId: number, cycleId: number, budget: number) => void;
  closeCycle: (projectId: number, cycleId: number) => void;
  // Catálogos
  addCatalog: (type: "ecosystems" | "expenseTypes", name: string) => void;
  deactivateCatalog: (type: "ecosystems" | "expenseTypes", item: string) => void;
  // Gastos
  saveExpense: (projectId: number, cycleId: number, expenseId: number | null, data: ExpenseInput) => Result;
  duplicateExpense: (projectId: number, cycleId: number, expenseId: number) => void;
  deleteExpense: (projectId: number, cycleId: number, expenseId: number) => void;
  // Usuarios
  createUser: (data: UserInput) => Result;
  updateUser: (id: number, data: UserInput) => Result;
  deleteUser: (id: number) => Result;
  reassignAndDeleteUser: (userId: number, newLeaderId: number) => Result;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppData>(() => loadData());
  const ref = useRef<AppData>(state);

  // Persistencia local en cada cambio.
  useEffect(() => {
    ref.current = state;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { console.warn("No se pudo guardar el avance:", error); }
  }, [state]);

  /* Aplica una mutación sobre una copia del estado y la publica.
     Mantiene ref.current sincronizado para lecturas encadenadas. */
  const commit = useCallback((mutate: (draft: AppData) => void) => {
    const next = structuredClone(ref.current);
    mutate(next);
    ref.current = next;
    setState(next);
  }, []);

  const findProject = (data: AppData, id: number) => data.projects.find((p) => p.id === Number(id));
  const findCycle = (project: Project | undefined, id: number) => project?.cycles.find((c) => c.id === Number(id));

  const activeUser = useMemo(
    () => state.users.find((user) => user.id === Number(state.activeUserId) && user.active) ?? null,
    [state.users, state.activeUserId],
  );
  const isJefatura = activeUser?.role === "JEFATURA";
  const canManagePortfolio = activeUser?.role !== "LIDER_PROYECTO";

  const store: Store = {
    state,
    activeUser,
    isJefatura,
    canManagePortfolio,
    canManageExpenses: (project) =>
      activeUser?.role === "JEFATURA" || (activeUser?.role === "LIDER_PROYECTO" && project.leaderUserId === activeUser.id),
    accessibleProjects: () =>
      activeUser?.role === "LIDER_PROYECTO"
        ? state.projects.filter((project) => project.leaderUserId === activeUser.id)
        : state.projects,
    getProject: (id) => findProject(state, id),
    getCycle: (project, id) => findCycle(project, id),

    login: (username, password) => {
      const user = state.users.find(
        (item) => item.active && item.username.toLowerCase() === username.trim().toLowerCase() && item.password === password,
      );
      if (!user) return { ok: false, message: "Usuario o contraseña incorrectos." };
      commit((draft) => { draft.activeUserId = user.id; });
      return { ok: true };
    },
    logout: () => commit((draft) => { draft.activeUserId = null; }),

    setSelectedYear: (year) => commit((draft) => { draft.selectedYear = year; }),
    resetData: () => {
      const fresh = normalize(demoData());
      ref.current = fresh;
      setState(fresh);
    },

    createProject: (data, year) => {
      const result = { ok: false } as { ok: boolean; projectId?: number; cycleId?: number };
      commit((draft) => {
        const id = Math.max(0, ...draft.projects.map((p) => p.id)) + 1;
        const leader = draft.users.find((user) => user.id === Number(data.leaderUserId));
        const cycleId = newId();
        draft.projects.push({
          id, name: data.name, ecosystem: data.ecosystem, objective: data.objective, description: data.description,
          notes: data.notes, start: data.start, end: data.end,
          leader: leader?.name ?? "", leaderUserId: leader?.id ?? 0,
          cycles: [{ id: cycleId, year, openedAt: "", approval: "Borrador", status: "Borrador", act: "", approvalDate: "", budget: 0, closed: false, expenses: [] }],
        });
        draft.selectedYear = String(year);
        result.ok = true; result.projectId = id; result.cycleId = cycleId;
      });
      return result;
    },
    updateProject: (id, data) => {
      commit((draft) => {
        const project = findProject(draft, id);
        const leader = draft.users.find((user) => user.id === Number(data.leaderUserId));
        if (!project) return;
        Object.assign(project, {
          name: data.name, ecosystem: data.ecosystem, objective: data.objective, description: data.description,
          notes: data.notes, start: data.start, end: data.end,
          leader: leader?.name ?? project.leader, leaderUserId: leader?.id ?? project.leaderUserId,
        });
      });
      return { ok: true, message: "Información del proyecto actualizada." };
    },
    deleteProject: (id) => {
      commit((draft) => { draft.projects = draft.projects.filter((project) => project.id !== Number(id)); });
      return { ok: true, message: "Proyecto eliminado." };
    },
    deleteCell: (name) => {
      commit((draft) => {
        draft.ecosystems = draft.ecosystems.filter((item) => item !== name);
        draft.projects = draft.projects.filter((project) => project.ecosystem !== name);
      });
      return { ok: true, message: "Célula eliminada junto con sus proyectos asociados." };
    },
    createCycle: (projectId, year, notes) => {
      const current = findProject(ref.current, projectId);
      if (current?.cycles.some((cycle) => cycle.year === Number(year))) {
        return { ok: false, message: "Ese proyecto ya tiene una vigencia para el año indicado." };
      }
      commit((draft) => {
        const project = findProject(draft, projectId);
        project?.cycles.push({ id: newId(), year: Number(year), openedAt: "", approval: "Borrador", status: "Borrador", act: "", approvalDate: "", budget: 0, closed: false, notes, expenses: [] });
      });
      return { ok: true, message: "Nueva vigencia creada en borrador." };
    },
    submitReview: (projectId, cycleId) => commit((draft) => {
      const cycle = findCycle(findProject(draft, projectId), cycleId);
      if (cycle) cycle.approval = "En revisión";
    }),
    recordDecision: (projectId, cycleId, data) => commit((draft) => {
      const cycle = findCycle(findProject(draft, projectId), cycleId);
      if (!cycle) return;
      cycle.approval = data.approval; cycle.act = data.act; cycle.approvalDate = data.approvalDate; cycle.notes = data.notes;
    }),
    assignBudget: (projectId, cycleId, budget) => commit((draft) => {
      const cycle = findCycle(findProject(draft, projectId), cycleId);
      if (!cycle) return;
      if (cycle.status !== "Iniciado") { cycle.status = "Iniciado"; cycle.openedAt = new Date().toISOString().slice(0, 10); }
      cycle.budget = Number(budget);
    }),
    closeCycle: (projectId, cycleId) => commit((draft) => {
      const cycle = findCycle(findProject(draft, projectId), cycleId);
      if (cycle) { cycle.closed = true; cycle.status = "Cerrado"; }
    }),

    addCatalog: (type, name) => commit((draft) => { draft[type] = [...draft[type], name]; }),
    deactivateCatalog: (type, item) => commit((draft) => { draft[type] = draft[type].filter((entry) => entry !== item); }),

    saveExpense: (projectId, cycleId, expenseId, data) => {
      const cycle = findCycle(findProject(ref.current, projectId), cycleId);
      if (!cycle) return { ok: false, message: "No se encontró la vigencia." };
      const values = expenseTotals(cycle);
      const existing = expenseId ? cycle.expenses.find((e) => e.id === expenseId) : null;
      const remaining = values.available + (existing ? existing.value : 0);
      if (!/^(0[1-9]|1[0-2])$/.test(data.month)) return { ok: false, message: "Selecciona un mes válido para el gasto." };
      if (data.value > remaining) return { ok: false, message: "El valor supera el saldo disponible de la vigencia." };
      if (data.status === "Ejecutado" && !data.order.trim()) return { ok: false, message: "Un gasto ejecutado requiere número de orden de pedido." };
      commit((draft) => {
        const target = findCycle(findProject(draft, projectId), cycleId);
        if (!target) return;
        const payload = { date: `${target.year}-${data.month}-01`, provider: data.provider, type: data.type, value: data.value, status: data.status, order: data.order };
        const existingInDraft = expenseId ? target.expenses.find((e) => e.id === expenseId) : null;
        if (existingInDraft) Object.assign(existingInDraft, payload);
        else target.expenses.push({ id: newId(), ...payload });
      });
      return { ok: true, message: existing ? "Gasto corregido." : "Gasto registrado." };
    },
    duplicateExpense: (projectId, cycleId, expenseId) => commit((draft) => {
      const cycle = findCycle(findProject(draft, projectId), cycleId);
      const source = cycle?.expenses.find((e) => e.id === expenseId);
      if (cycle && source) cycle.expenses.push({ ...source, id: newId() });
    }),
    deleteExpense: (projectId, cycleId, expenseId) => commit((draft) => {
      const cycle = findCycle(findProject(draft, projectId), cycleId);
      if (cycle) cycle.expenses = cycle.expenses.filter((e) => e.id !== expenseId);
    }),

    createUser: (data) => {
      const username = data.username.trim().toLowerCase();
      if (ref.current.users.some((user) => user.username.toLowerCase() === username)) return { ok: false, message: "Ese usuario ya existe." };
      commit((draft) => {
        draft.users.push({ id: newId(), name: data.name.trim(), username, password: data.password ?? "Sabana2026!", role: data.role, active: true });
      });
      return { ok: true, message: "Usuario creado." };
    },
    updateUser: (id, data) => {
      const username = data.username.trim().toLowerCase();
      const clash = ref.current.users.some((item) => item.id !== id && item.username.toLowerCase() === username);
      if (clash) return { ok: false, message: "Ese usuario ya existe." };
      if (data.role !== "LIDER_PROYECTO" && ref.current.projects.some((project) => project.leaderUserId === id)) {
        return { ok: false, message: "Reasigna los proyectos antes de cambiar el rol de este líder." };
      }
      commit((draft) => {
        const user = draft.users.find((item) => item.id === id);
        if (!user) return;
        Object.assign(user, { name: data.name.trim(), username, role: data.role, ...(data.password ? { password: data.password } : {}) });
        draft.projects.forEach((project) => { if (project.leaderUserId === id) project.leader = user.name; });
      });
      return { ok: true, message: "Usuario actualizado." };
    },
    deleteUser: (id) => {
      if (ref.current.projects.some((project) => project.leaderUserId === id)) {
        return { ok: false, message: "Reasigna los proyectos de este líder antes de eliminarlo." };
      }
      commit((draft) => { draft.users = draft.users.filter((user) => user.id !== id); });
      return { ok: true, message: "Usuario eliminado." };
    },
    reassignAndDeleteUser: (userId, newLeaderId) => {
      const leader = ref.current.users.find((item) => item.id === newLeaderId && item.active && item.role === "LIDER_PROYECTO");
      if (!leader || leader.id === userId) return { ok: false, message: "Selecciona un nuevo líder válido." };
      commit((draft) => {
        const target = draft.users.find((item) => item.id === newLeaderId);
        draft.projects.forEach((project) => { if (project.leaderUserId === userId && target) { project.leaderUserId = target.id; project.leader = target.name; } });
        draft.users = draft.users.filter((item) => item.id !== userId);
      });
      return { ok: true, message: "Proyectos reasignados y usuario eliminado." };
    },
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore debe usarse dentro de <StoreProvider>.");
  return store;
}
