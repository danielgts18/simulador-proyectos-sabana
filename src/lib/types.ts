/* =========================================================================
   Modelo de dominio · Seguimiento presupuestal
   Estados en español, tal como los devuelve la API.
   ========================================================================= */

export type Role = "JEFATURA" | "GESTOR_FINANCIERO" | "LIDER_PROYECTO";

export type ApprovalStatus = "Borrador" | "En revisión" | "Aprobado" | "Rechazado";
export type CycleStatus = "Borrador" | "Iniciado" | "Cerrado";
export type ExpenseStatus = "Comprometido" | "Ejecutado";

export const roleLabels: Record<Role, string> = {
  JEFATURA: "Jefatura",
  GESTOR_FINANCIERO: "Gestor financiero",
  LIDER_PROYECTO: "Líder de proyecto",
};
