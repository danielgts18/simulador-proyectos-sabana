import type { IconName } from "@/components/icons";

/* Ícono representativo por célula / ecosistema (con respaldo genérico). */
const cellIconMap: Record<string, IconName> = {
  "Aprendizaje": "layers",
  "CX": "user",
  "Analítica": "coins",
  "Innovación & Agentica": "play",
  "GUIA": "calendar",
};

export function cellIconName(name: string): IconName {
  return cellIconMap[name] ?? "folder";
}
