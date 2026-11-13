/* =========================================================================
   Componentes de presentación · Sistema de diseño institucional
   Un componente por patrón: encabezado de página, KPI, barra de presupuesto,
   etiqueta de estado, estado vacío, carga/error y avisos.
   ========================================================================= */
import { useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { icons, Icon, type IconName } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { money, pct } from "@/lib/format";
import { statusClass, cycleStages, expenseTotals, type CycleFlow } from "@/lib/calculations";
import { useStore, type Cycle } from "@/store/apiStore";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

/* ---- Encabezado de página ----------------------------------------------- */
/** Estructura única de encabezado. `detail` lo presenta como tarjeta (célula, proyecto, vigencia). */
export function PageHeader({ eyebrow, title, subtitle, tags, actions, detail = false }: {
  eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; tags?: ReactNode; actions?: ReactNode; detail?: boolean;
}) {
  return <header className={`page-header ${detail ? "detail" : ""}`}>
    <div className="ph-main">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
      {tags && <div className="ph-tags">{tags}</div>}
    </div>
    {actions && <div className="ph-actions">{actions}</div>}
  </header>;
}

/** Etiqueta informativa del encabezado (líder, fechas, GL…). */
export function Tag({ icon, children }: { icon?: IconName; children: ReactNode }) {
  return <span className="tag">{icon && <Icon name={icon} />}{children}</span>;
}

/* ---- Etiquetas de estado (siempre con texto, nunca solo color) ---------- */
export function Pill({ tone = "neutral", dot = true, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return <span className={`pill tone-${tone} ${dot ? "" : "no-dot"}`}>{children}</span>;
}

const STATUS_TONE: Record<string, Tone> = {
  draft: "warning", review: "warning", approved: "success", started: "success", executed: "success",
  rejected: "neutral", closed: "neutral", committed: "info", over: "danger",
};
/** Estado de negocio (Borrador, Aprobado, Ejecutado…) con su tono. */
export function Badge({ value }: { value: string }) {
  return <Pill tone={STATUS_TONE[statusClass(value)] ?? "neutral"}>{value}</Pill>;
}

export function OverFlag() {
  return <span className="pill tone-danger no-dot"><icons.alert /> Sobreejecución</span>;
}

/* ---- KPI ----------------------------------------------------------------- */
export function Kpi({ label, value, icon, tone = "info", hint }: { label: string; value: ReactNode; icon: IconName; tone?: Tone; hint?: ReactNode }) {
  return <article className={`kpi tone-${tone}`}>
    <span className="kpi-ico"><Icon name={icon} /></span>
    <div className="kpi-body">
      <div className="kpi-val">{value}</div>
      <div className="kpi-lbl">{label}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  </article>;
}

/* ---- Barra de presupuesto (ejecutado · comprometido · disponible) ------- */
export function BudgetBar({ budget, executed, committed, size = "md", meta = false }: {
  budget: number; executed: number; committed: number; size?: "md" | "lg"; meta?: boolean;
}) {
  const used = executed + committed;
  const over = used > budget;
  if (!budget) return <span className="muted-note">Sin presupuesto asignado</span>;
  const cap = Math.max(budget, used) || 1;
  return <div className="bar-block">
    <div className={`bar ${size} ${over ? "is-over" : ""}`} role="img"
      aria-label={`Ejecutado ${money(executed)}, comprometido ${money(committed)}, de un presupuesto de ${money(budget)}`}>
      <span className="s-exec" style={{ width: `${(executed / cap) * 100}%` }} />
      <span className="s-comm" style={{ width: `${(committed / cap) * 100}%` }} />
      {over && <span className="s-limit" style={{ left: `${(budget / cap) * 100}%` }} title="Límite del presupuesto" />}
    </div>
    {meta && <div className="bar-meta">
      <span><b>{money(used)}</b> de {money(budget)}</span>
      <b className={over ? "is-over" : ""}>{pct((used / budget) * 100)}</b>
    </div>}
  </div>;
}

export function CycleBudgetBar({ cycle, meta = true }: { cycle: Cycle; meta?: boolean }) {
  const t = expenseTotals(cycle);
  return <BudgetBar budget={cycle.budget || 0} executed={t.executed} committed={t.committed} meta={meta} />;
}

export function BarLegend({ free = true }: { free?: boolean }) {
  return <div className="bar-legend">
    <span><i className="k-exec" />Ejecutado</span>
    <span><i className="k-comm" />Comprometido</span>
    {free && <span><i className="k-free" />Disponible</span>}
  </div>;
}

/** Barra simple 0–100 % (avance de implementación). */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const v = Math.min(100, Math.max(0, Math.round(value)));
  return <div className="bar" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
    <span className="s-exec" style={{ width: `${v}%` }} />
  </div>;
}

/* ---- Estados vacíos ------------------------------------------------------ */
export function EmptyState({ title, children, action, icon = "inbox", compact = false }: { title: string; children?: ReactNode; action?: ReactNode; icon?: IconName; compact?: boolean }) {
  return <div className={`empty-state ${compact ? "compact" : ""}`}>
    <Icon name={icon} />
    <p className="es-title">{title}</p>
    {children && <p className="es-text">{children}</p>}
    {action}
  </div>;
}

export function EmptyRow({ colSpan, title, children }: { colSpan: number; title: string; children?: ReactNode }) {
  return <tr className="empty-row"><td colSpan={colSpan}><EmptyState compact title={title}>{children}</EmptyState></td></tr>;
}

/* ---- Avisos -------------------------------------------------------------- */
export function InfoBox({ children, cream = false }: { children: ReactNode; cream?: boolean }) {
  return <div className={`info-box ${cream ? "cream" : ""}`}><icons.info /><span>{children}</span></div>;
}

/* ---- Carga / error con reintento --------------------------------------- */
export function LoadState({ loading, error, onRetry, children = "Cargando información…" }: { loading?: boolean; error?: string | null; onRetry?: () => void; children?: ReactNode }) {
  if (error) return <div className="load-state error" role="alert">
    <icons.alert /><span>{error}</span>
    {onRetry && <button type="button" className="button secondary sm" onClick={onRetry}>Reintentar</button>}
  </div>;
  if (loading) return <div className="load-state" role="status"><span className="spinner" aria-hidden="true" /><span>{children}</span></div>;
  return null;
}

/* ---- Acceso denegado: avisa y vuelve al dashboard ----------------------- */
export function AccessDenied() {
  const { notify } = useToast();
  useEffect(() => { notify("No tienes acceso a esta sección.", true); }, [notify]);
  return <Navigate to="/dashboard" replace />;
}

/* ---- Selector de vigencia ----------------------------------------------- */
/** Solo se listan las vigencias que existen (de 2026 en adelante). */
export function YearSelect({ value, onChange }: { value: string; onChange: (year: string) => void }) {
  const { years } = useStore();
  const options = years.includes(value) ? years : [...years, value].sort();
  return <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Vigencia">
    {options.map((year) => <option key={year} value={year}>Vigencia {year}</option>)}
  </select>;
}

/* ---- Stepper del ciclo de vigencia ------------------------------------- */
const STEP_SR: Record<string, string> = { done: "completado", active: "paso actual", rejected: "rechazado", "": "pendiente" };
export function Stepper({ flow }: { flow: CycleFlow }) {
  return <ol className="stepper">{cycleStages.map((stage, i) => {
    let cls = "";
    if (flow.rejected && i === 2) cls = "rejected";
    else if (i < flow.stageIndex) cls = "done";
    else if (i === flow.stageIndex) cls = flow.closed ? "done" : "active";
    const inner = cls === "done" ? <icons.check /> : cls === "rejected" ? <icons.alert /> : cls === "active" ? <Icon name={stage.icon} /> : String(i + 1);
    const label = flow.rejected && i === 2 ? "Rechazada" : stage.label;
    return <li key={stage.label} className={cls} aria-current={cls === "active" ? "step" : undefined}>
      <span className="dot" aria-hidden="true">{inner}</span>
      <span className="step-label">{label}<span className="sr-only"> · {STEP_SR[cls]}</span></span>
    </li>;
  })}</ol>;
}
