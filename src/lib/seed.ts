/* =========================================================================
   Datos de demostración iniciales. Se usan cuando no hay avance guardado.
   Portados del prototipo estático (web/app.js).
   ========================================================================= */
import type { AppData } from "@/lib/types";

export function demoData(): AppData {
  return {
    activeUserId: null,
    selectedYear: "2026",
    users: [
      { id: 1, name: "Jefatura de Innovación", username: "jefatura", password: "Sabana2026!", role: "JEFATURA", active: true },
      { id: 2, name: "Gestora financiera", username: "gestor", password: "Sabana2026!", role: "GESTOR_FINANCIERO", active: true },
      { id: 3, name: "Mariana López", username: "mariana", password: "Sabana2026!", role: "LIDER_PROYECTO", active: true },
    ],
    ecosystems: ["Aprendizaje", "CX", "Analítica", "Sistematización", "IA Agéntica", "Todo"],
    expenseTypes: [
      "Licencias y suscripciones", "Consultoría", "Integraciones", "Gestión del recurso humano", "Capacitación",
      "Equipos de computo", "Imprevistos", "Alimentación", "Comunicaciones y gestión del cambio", "Activos",
      "Publicidad y promoción", "Mantenimiento Construcciones y Edificaciones", "Presupuesto disponible",
      "Practicante", "Desarrollo", "Servicios profesionales - Honorarios", "Traslado",
    ],
    projects: [
      {
        id: 1, name: "Aula de aprendizaje adaptativo", ecosystem: "Aprendizaje", leader: "Mariana López", leaderUserId: 3,
        description: "Diseño e implementación de experiencias de aprendizaje adaptativo.", objective: "Fortalecer experiencias educativas personalizadas.",
        start: "2026-02-01", end: "2026-11-30", notes: "Proyecto estratégico de innovación.",
        cycles: [
          { id: 101, year: 2026, openedAt: "2026-02-01", approval: "Aprobado", status: "Iniciado", act: "SC-014-2026", approvalDate: "2026-01-28", budget: 85000000, closed: false, expenses: [
            { id: 1, date: "2026-02-18", provider: "TechLearn SAS", type: "Licencias y suscripciones", value: 12000000, status: "Ejecutado", order: "OP-48102" },
            { id: 2, date: "2026-03-03", provider: "Nexo Digital", type: "Desarrollo", value: 18000000, status: "Comprometido", order: "" },
          ] },
          { id: 102, year: 2025, openedAt: "2025-02-06", approval: "Aprobado", status: "Cerrado", act: "SC-098-2025", approvalDate: "2025-02-03", budget: 73000000, closed: true, expenses: [] },
        ],
      },
      {
        id: 2, name: "Asistente de experiencia estudiantil", ecosystem: "CX", leader: "Juan David Rojas", leaderUserId: 0,
        description: "Asistente digital para atención de estudiantes.", objective: "Mejorar la experiencia de servicio.",
        start: "2026-01-15", end: "2026-12-12", notes: "",
        cycles: [
          { id: 201, year: 2026, openedAt: "2026-02-05", approval: "Aprobado", status: "Iniciado", act: "SC-022-2026", approvalDate: "2026-02-04", budget: 42000000, closed: false, expenses: [
            { id: 3, date: "2026-02-20", provider: "Contacto Uno", type: "Consultoría", value: 9000000, status: "Ejecutado", order: "OP-48290" },
            { id: 4, date: "2026-03-11", provider: "CX Research", type: "Consultoría", value: 12000000, status: "Comprometido", order: "" },
          ] },
        ],
      },
      {
        id: 3, name: "Laboratorio de analítica institucional", ecosystem: "Analítica", leader: "Valentina Peña", leaderUserId: 0,
        description: "Capacidades de analítica para decisiones institucionales.", objective: "Consolidar información para análisis estratégico.",
        start: "2026-03-01", end: "2026-12-20", notes: "",
        cycles: [
          { id: 301, year: 2026, openedAt: "2026-03-01", approval: "Aprobado", status: "Iniciado", act: "SC-031-2026", approvalDate: "2026-02-20", budget: 30000000, closed: false, expenses: [
            { id: 5, date: "2026-03-14", provider: "Data Horizon", type: "Integraciones", value: 22000000, status: "Ejecutado", order: "OP-48531" },
            { id: 6, date: "2026-03-20", provider: "Datos Abiertos", type: "Capacitación", value: 11000000, status: "Comprometido", order: "" },
          ] },
        ],
      },
      {
        id: 4, name: "Automatización de procesos académicos", ecosystem: "IA Agéntica", leader: "Santiago Melo", leaderUserId: 0,
        description: "Automatización de tareas académicas mediante IA.", objective: "Reducir tiempos operativos.",
        start: "2026-04-01", end: "2026-12-15", notes: "Pendiente de aprobación anual.",
        cycles: [
          { id: 401, year: 2026, openedAt: "", approval: "En revisión", status: "Borrador", act: "", approvalDate: "", budget: 0, closed: false, expenses: [] },
        ],
      },
    ],
  };
}
