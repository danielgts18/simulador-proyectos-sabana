/* =========================================================================
   Botón "+ Gasto" para listas (Inicio y células): abre el formulario de gasto
   de la vigencia sin pasar por la página del proyecto.
   ========================================================================= */
import { useRef, useState } from "react";
import { icons } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { useStore, type Cycle, type Project } from "@/store/apiStore";
import { ExpenseModal } from "@/features/expenses/ExpenseModal";

export function QuickExpenseButton({ projectId, cycleId, projectName, onSaved }: { projectId: number; cycleId: number; projectName: string; onSaved?: () => void }) {
  const { fetchProjectDetail } = useStore();
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<{ project: Project; cycle: Cycle } | null>(null);
  const saved = useRef(false);

  const open = async () => {
    setLoading(true);
    const result = await fetchProjectDetail(projectId);
    setLoading(false);
    if (!result.ok) { notify(result.message, true); return; }
    const cycle = result.project.cycles.find((c) => c.id === cycleId);
    if (!cycle) { notify("La vigencia ya no existe.", true); return; }
    if (cycle.closed) { notify("La vigencia está cerrada.", true); return; }
    saved.current = false;
    setTarget({ project: result.project, cycle });
  };

  return <>
    <button type="button" className="button subtle sm" disabled={loading} onClick={() => { void open(); }} aria-label={`Registrar gasto en ${projectName}`}>
      <icons.plus /> {loading ? "Abriendo…" : "Gasto"}
    </button>
    {target && <ExpenseModal project={target.project} cycle={target.cycle} onSaved={() => { saved.current = true; }}
      onClose={() => { setTarget(null); if (saved.current) onSaved?.(); }} />}
  </>;
}
