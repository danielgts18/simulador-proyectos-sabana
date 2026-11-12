/* =========================================================================
   Cifras por vigencia desde el servidor.
   El listado GET /projects no trae vigencias ni gastos, así que los totales de
   las vistas de células/proyectos salen del endpoint agregado /dashboard.
   ========================================================================= */
import { useCallback, useEffect, useState } from "react";
import { api, type ApiDashboard } from "@/lib/api";

export type YearRow = ApiDashboard["rows"][number];

export function useYearRows(year: string) {
  const [rows, setRows] = useState<YearRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api.dashboard(Number(year))
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setRows(res.data.rows);
        // Sin datos válidos no se muestran cifras en cero que parezcan reales.
        else { setRows([]); setError(res.message); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year, reloadKey]);

  return { rows, loading, error, retry };
}

export interface RowsSummary {
  budget: number;
  committed: number;
  executed: number;
  used: number;
  available: number;
  over: number;
  activeCycles: number;
}

/** Totales de un conjunto de filas (por ejemplo, las de una célula). */
export function summarizeRows(rows: YearRow[]): RowsSummary {
  let budget = 0, committed = 0, executed = 0, over = 0, activeCycles = 0;
  for (const r of rows) {
    budget += r.budget; committed += r.committed; executed += r.executed;
    if (r.available < 0) over += 1;
    if (r.cycleId !== null && !r.closed) activeCycles += 1;
  }
  return { budget, committed, executed, used: committed + executed, available: budget - committed - executed, over, activeCycles };
}
