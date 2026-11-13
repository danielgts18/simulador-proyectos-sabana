/* =========================================================================
   Componentes de presentación reutilizables · Sistema de diseño institucional
   ========================================================================= */
import type { ReactNode } from "react";
import { icons, Icon, type IconName } from "@/components/icons";
import { money } from "@/lib/format";
import { statusClass, cycleStages, expenseTotals, type CycleFlow, type Totals } from "@/lib/calculations";
import type { Cycle } from "@/store/apiStore";

/* ---- Badge de estado (con punto, no solo color) ------------------------ */
export function Badge({ value }: { value: string }) {
  return <span className={`badge ${statusClass(value)}`}>{value}</span>;
}

/* ---- Etiqueta de sobreejecución (icono + texto) ------------------------ */
export function OverFlag() {
  return <span className="over-flag"><icons.alert /> Sobreejecución</span>;
}

/* ---- Tarjeta de métrica / KPI ------------------------------------------ */
export function Metric({ label, value, icon, tone = "", foot }: { label: string; value: string; icon: IconName; tone?: string; foot?: ReactNode }) {
  return <article className={`metric ${tone}`}>
    <div className="metric-top"><div className="metric-label">{label}</div><div className="metric-icon"><Icon name={icon} /></div></div>
    <div className="metric-value">{value}</div>
    {foot ? <div className="metric-foot">{foot}</div> : null}
  </article>;
}

/* ---- Barra de ejecución presupuestal ----------------------------------- */
export function BudgetBar({ budget, totals }: { budget: number; totals: Totals }) {
  const isOver = totals.available < 0;
  if (!budget) return <div className="pbar-meta"><span>Sin presupuesto asignado</span></div>;
  const cap = isOver ? totals.used : budget;
  const execPct = Math.min(100, (totals.executed / cap) * 100);
  const commPct = Math.min(100 - execPct, (totals.committed / cap) * 100);
  const usedPct = Math.round((totals.used / budget) * 100);
  return <>
    <div className={`pbar ${isOver ? "is-over" : ""}`}><span className="seg-exec" style={{ width: `${execPct}%` }} /><span className="seg-comm" style={{ width: `${commPct}%` }} /></div>
    <div className="pbar-meta"><span><b>{money(totals.used)}</b> de {money(budget)}</span><span className={isOver ? "is-over" : ""}><b className={isOver ? "is-over" : ""}>{usedPct}%</b></span></div>
  </>;
}

/* Envoltura práctica: recibe un ciclo y calcula sus totales. */
export function CycleBudgetBar({ cycle }: { cycle: Cycle }) {
  return <BudgetBar budget={cycle.budget || 0} totals={expenseTotals(cycle)} />;
}

export function BudgetLegend() {
  return <div className="pbar-legend"><span><i className="k-exec" />Ejecutado</span><span><i className="k-comm" />Comprometido</span><span><i className="k-avail" />Disponible</span></div>;
}

/* ---- Celda consolidada de ejecución ------------------------------------ */
export function ExecCell({ budget, totals }: { budget: number; totals: Totals }) {
  if (!budget) return <span className="exec-empty">Sin presupuesto asignado</span>;
  const isOver = totals.available < 0;
  const usedPct = Math.round((totals.used / budget) * 100);
  const cap = isOver ? totals.used : budget;
  const execPct = Math.min(100, (totals.executed / cap) * 100);
  const commPct = Math.min(100 - execPct, (totals.committed / cap) * 100);
  return <>
    <div className="exec-top"><span className="exec-budget">{money(budget)}</span><span className={`exec-pct ${isOver ? "is-over" : ""}`}>{usedPct}%</span></div>
    <div className={`pbar ${isOver ? "is-over" : ""}`}><span className="seg-exec" style={{ width: `${execPct}%` }} /><span className="seg-comm" style={{ width: `${commPct}%` }} /></div>
    <div className="exec-foot"><span>Ejecutado {money(totals.executed)}</span><span className={`exec-saldo ${isOver ? "is-over" : ""}`}>Saldo {money(totals.available)}</span></div>
  </>;
}

/* ---- Bloque informativo ------------------------------------------------ */
export function InfoBox({ children, cream = false }: { children: ReactNode; cream?: boolean }) {
  return <div className={`info-box ${cream ? "cream" : ""}`}><icons.info /><span>{children}</span></div>;
}

/* ---- Fila de estado vacío (tabla) -------------------------------------- */
export function EmptyRow({ children, colSpan }: { children: ReactNode; colSpan: number }) {
  return <tr><td colSpan={colSpan} className="empty"><icons.inbox />{children}</td></tr>;
}

/* ---- Estado de carga / error con reintento ----------------------------- */
export function LoadState({ loading, error, onRetry, children = "Cargando información…" }: { loading?: boolean; error?: string | null; onRetry?: () => void; children?: ReactNode }) {
  if (error) return <div className="load-state error" role="alert">
    <icons.alert /><span>{error}</span>
    {onRetry && <button type="button" className="button secondary sm" onClick={onRetry}>Reintentar</button>}
  </div>;
  if (loading) return <div className="load-state" role="status"><span className="spinner" aria-hidden="true" /><span>{children}</span></div>;
  return null;
}

/* ---- Barra de avance simple (0–100 %) ----------------------------------- */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return <div className="pbar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
    <span className="seg-exec" style={{ width: `${pct}%` }} />
  </div>;
}

/* ---- Selector de vigencia ----------------------------------------------- */
/** Rango: año actual −2 … +2, incluyendo siempre el año seleccionado aunque quede fuera. */
export function yearOptions(selected: string): string[] {
  const now = new Date().getFullYear();
  const years = new Set<string>([selected]);
  for (let y = now - 2; y <= now + 2; y += 1) years.add(String(y));
  return [...years].filter(Boolean).sort((a, b) => Number(a) - Number(b));
}

export function YearSelect({ value, onChange }: { value: string; onChange: (year: string) => void }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Vigencia">
    {yearOptions(value).map((year) => <option key={year} value={year}>Vigencia {year}</option>)}
  </select>;
}

/* ---- Stepper del ciclo de vigencia ------------------------------------- */
export function Stepper({ flow }: { flow: CycleFlow }) {
  return <ol className="stepper">{cycleStages.map((stage, i) => {
    let cls = "";
    if (flow.rejected && i === 2) cls = "rejected";
    else if (i < flow.stageIndex) cls = "done";
    else if (i === flow.stageIndex) cls = flow.closed ? "done" : "active";
    const inner = cls === "done" ? <icons.check /> : cls === "rejected" ? <icons.alert /> : cls === "active" ? <Icon name={stage.icon} /> : String(i + 1);
    const label = flow.rejected && i === 2 ? "Rechazada" : stage.label;
    return <li key={stage.label} className={cls} aria-current={cls === "active" ? "step" : undefined}><span className="dot">{inner}</span><span className="step-label">{label}</span></li>;
  })}</ol>;
}
