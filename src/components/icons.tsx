/* =========================================================================
   Íconos de línea (estilo institucional, trazo consistente).
   Portados del prototipo estático (web/app.js) a componentes React.
   ========================================================================= */
import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const icons = {
  home: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /><path d="M9.5 21v-6h5v6" /></svg>,
  folder: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>,
  tags: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M3 8V5a2 2 0 0 1 2-2h3l10.5 10.5a2 2 0 0 1 0 2.8l-3.2 3.2a2 2 0 0 1-2.8 0L2 9" /><circle cx="7" cy="7" r="1.3" /></svg>,
  wallet: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M3 7a2 2 0 0 1 2-2h12v4" /><path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5" /><circle cx="16.5" cy="12.5" r="1.3" /></svg>,
  lock: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></svg>,
  check: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M20 6 9 17l-5-5" /></svg>,
  circleCheck: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>,
  wallet2: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></svg>,
  clock: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>,
  coins: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" /><path d="M15 12.5c2.8-.2 6-1.4 6-3.2" /><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" /></svg>,
  alert: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M10.3 3.9 2.4 17.5A1.9 1.9 0 0 0 4 20.4h16a1.9 1.9 0 0 0 1.6-2.9L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z" /><path d="M12 9v4.5" /><path d="M12 17h.01" /></svg>,
  user: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>,
  calendar: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></svg>,
  layers: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg>,
  plus: (p: SVGProps<SVGSVGElement>) => <svg {...base} strokeWidth={2} {...p}><path d="M12 5v14M5 12h14" /></svg>,
  arrowLeft: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>,
  arrowRight: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M5 12h14M12 5l7 7-7 7" /></svg>,
  chevron: (p: SVGProps<SVGSVGElement>) => <svg {...base} strokeWidth={2} {...p}><path d="m9 6 6 6-6 6" /></svg>,
  refresh: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5" /></svg>,
  search: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  info: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>,
  send: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7Z" /></svg>,
  gavel: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="m14 12-8.5 8.5a1.5 1.5 0 0 1-2.1-2.1L12 9.9" /><path d="m11 6 7 7M8.5 8.5l6-6M15.5 9.5l-6 6" /><path d="M14 21h7" /></svg>,
  play: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M6 4.5v15l13-7.5-13-7.5Z" /></svg>,
  pencil: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z" /><path d="M13.5 6.5 17.5 10.5" /></svg>,
  copy: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2" /></svg>,
  trash: (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M4 7h16M9.5 11v5M14.5 11v5M6.5 7l1 13h9l1-13M9 7V4h6v3" /></svg>,
  inbox: (p: SVGProps<SVGSVGElement>) => <svg {...base} strokeWidth={1.6} {...p}><path d="M3 13h4l1.5 3h7L17 13h4" /><path d="M4.5 13 6 5h12l1.5 8v5a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2v-5Z" /></svg>,
} as const;

export type IconName = keyof typeof icons;

/** Renderiza un ícono por nombre (para nombres dinámicos derivados de datos). */
export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  const Component = icons[name];
  return <Component {...props} />;
}
