import type { IconName } from "@/components/icons";

/* Ícono representativo por célula / ecosistema (con respaldo genérico). */
const cellIconMap: Record<string, IconName> = {
  "Aprendizaje": "layers",
  "CX": "user",
  "Analítica": "coins",
  "Sistematización": "tags",
  "IA Agéntica": "wallet2",
  "Todo": "folder",
};

export function cellIconName(name: string): IconName {
  return cellIconMap[name] ?? "folder";
}
