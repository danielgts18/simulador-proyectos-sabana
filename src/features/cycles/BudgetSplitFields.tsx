/* =========================================================================
   Campos de distribución del presupuesto: Proveedores + Recurso humano.
   El presupuesto total es la suma de ambos; se muestra en vivo. Con `fixedTotal`
   (completar una vigencia ya presupuestada) se indica cuánto falta o sobra.
   Los valores se leen del formulario por nombre: budgetProviders / budgetHr.
   ========================================================================= */
import { useState } from "react";
import { money } from "@/lib/format";

export function BudgetSplitFields({ fixedTotal, error, onChange }: { fixedTotal?: number; error?: string | null; onChange?: () => void }) {
  const [providers, setProviders] = useState("");
  const [hr, setHr] = useState("");
  const total = (Number(providers) || 0) + (Number(hr) || 0);
  const diff = fixedTotal !== undefined ? fixedTotal - total : 0;

  return <>
    <label>Proveedores (COP)
      <input className="field" name="budgetProviders" type="number" min={0} step={1} inputMode="numeric" required value={providers}
        onChange={(e) => { setProviders(e.target.value); onChange?.(); }} aria-invalid={!!error} aria-describedby={error ? "split-msg" : undefined} />
    </label>
    <label>Recurso humano (COP)
      <input className="field" name="budgetHr" type="number" min={0} step={1} inputMode="numeric" required value={hr}
        onChange={(e) => { setHr(e.target.value); onChange?.(); }} aria-invalid={!!error} aria-describedby={error ? "split-msg" : undefined} />
    </label>
    <div className="wide split-total" aria-live="polite">
      <span>{fixedTotal !== undefined ? "Presupuesto de la vigencia" : "Presupuesto total"}</span>
      <b>{money(fixedTotal !== undefined ? fixedTotal : total)}</b>
      {fixedTotal !== undefined && <span className={diff === 0 ? "split-ok" : "split-diff"}>{diff === 0 ? "Distribución completa" : diff > 0 ? `Faltan ${money(diff)} por distribuir` : `Te pasas ${money(-diff)}`}</span>}
    </div>
    {error && <span id="split-msg" className="field-error wide">{error}</span>}
  </>;
}
