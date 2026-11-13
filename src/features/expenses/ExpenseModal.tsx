/* =========================================================================
   Modal: registrar / corregir / duplicar gasto
   · Registrar: "Guardar y registrar otro" conserva mes, proveedor, tipo y estado.
   · Gasto ejecutado: solo se corrigen la orden de pedido y el comprobante.
   ========================================================================= */
import { useId, useRef, useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { InfoBox } from "@/components/ui";
import { useStore, type Cycle, type Expense, type Project } from "@/store/apiStore";
import { useToast } from "@/components/Toast";
import { expenseMonths, localDateISO } from "@/lib/format";
import type { ExpenseStatus } from "@/lib/types";

interface Props {
  project: Project;
  cycle: Cycle;
  expense?: Expense | null;
  duplicate?: boolean;
  onClose: () => void;
  /** Se invoca cada vez que un gasto se guarda (el modal puede seguir abierto). */
  onSaved?: () => void;
}

import { supportExempt } from "@/lib/calculations";
export function ExpenseModal({ project, cycle, expense = null, duplicate = false, onClose, onSaved }: Props) {
  const { expenseTypes, saveExpense } = useStore();
  const { notify } = useToast();
  const providerListId = useId();
  const againRef = useRef(false);

  const selectedMonth = expense?.date?.slice(5, 7) || localDateISO().slice(5, 7);
  // Un gasto ejecutado conserva mes, proveedor, tipo, valor y estado: solo se completan sus soportes.
  const lockCore = expense?.status === "Ejecutado" && !duplicate;
  const isNew = !expense;
  const [status, setStatus] = useState<ExpenseStatus>(expense?.status ?? "Comprometido");
  const [type, setType] = useState(expense?.type ?? "");
  // Practicantes y recurso humano no llevan orden de pedido ni comprobante.
  const exempt = supportExempt(type);
  const [saving, setSaving] = useState(false);
  // Un tipo de gasto desactivado se conserva como opción para no reemplazarlo en silencio.
  const typeMissing = !!expense && !expenseTypes.includes(expense.type);
  const providers = [...new Set(cycle.expenses.map((e) => e.provider))].sort((a, b) => a.localeCompare(b));

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const again = againRef.current;
    againRef.current = false;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const targetId = duplicate ? null : expense?.id ?? null;
    const support = exempt ? { order: "", receipt: "" } : { order: (data.order ?? "").trim(), receipt: (data.receipt ?? "").trim() };
    setSaving(true);
    const result = await saveExpense(project.id, cycle.id, targetId, lockCore && expense
      ? { month: expense.date.slice(5, 7), provider: expense.provider, type: expense.type, value: expense.value, status: expense.status, ...support }
      : { month: data.month, provider: data.provider.trim(), type: data.type, value: Number(data.value), status, ...support });
    setSaving(false);
    if (!result.ok) { notify(result.message ?? "No fue posible guardar el gasto.", true); return; }
    onSaved?.();
    if (again) {
      // Se conservan mes, proveedor, tipo y estado; se limpia lo que cambia en cada gasto.
      for (const name of ["value", "order", "receipt"]) {
        const el = form.elements.namedItem(name) as HTMLInputElement | null;
        if (el) el.value = "";
      }
      (form.elements.namedItem("value") as HTMLInputElement | null)?.focus();
      notify("Gasto registrado. Puedes registrar otro.");
      return;
    }
    onClose();
    notify(duplicate ? "Gasto duplicado." : expense ? (lockCore ? "Orden de pedido y comprobante actualizados." : "Gasto corregido.") : "Gasto registrado.");
  };

  const title = duplicate ? "Duplicar gasto" : lockCore ? "Corregir pedido y comprobante" : expense ? "Corregir gasto" : "Registrar gasto";
  const submitLabel = lockCore ? "Guardar cambios" : title;

  return <Modal
    title={title}
    eyebrow={`Vigencia ${cycle.year} · ${project.name}`}
    onClose={onClose}
    submitting={saving}
    onSubmit={(e) => { void onSubmit(e); }}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      {isNew && <button type="submit" className="button secondary" onClick={() => { againRef.current = true; }}>Guardar y registrar otro</button>}
      <button className="button" type="submit">{saving ? "Guardando…" : submitLabel}</button>
    </>}
  >
    <div className="form-grid">
      <label>Mes<select className="field" name="month" required disabled={lockCore} defaultValue={selectedMonth}>{expenseMonths.map((month, index) => {
        const value = String(index + 1).padStart(2, "0");
        return <option key={value} value={value}>{month}</option>;
      })}</select></label>
      <label>Proveedor<input className="field" name="provider" required disabled={lockCore} autoFocus={isNew} autoComplete="off" list={providerListId} defaultValue={expense?.provider ?? ""} />
        <datalist id={providerListId}>{providers.map((p) => <option key={p} value={p} />)}</datalist>
      </label>
      <label>Tipo de gasto<select className="field" name="type" required disabled={lockCore} value={type} onChange={(e) => setType(e.target.value)}>
        {isNew && <option value="" disabled>Selecciona un tipo…</option>}
        {typeMissing && expense && <option value={expense.type}>{expense.type} (inactivo)</option>}
        {expenseTypes.map((item) => <option key={item} value={item}>{item}</option>)}
      </select></label>
      <label>Valor (COP)<input className="field" name="value" type="number" min={1} required disabled={lockCore} defaultValue={expense?.value ?? ""} /></label>
      <label>Estado
        <select className="field" name="statusDisplay" value={status} onChange={(e) => setStatus(e.target.value as ExpenseStatus)} disabled={lockCore}>
          <option value="Comprometido">Comprometido</option>
          <option value="Ejecutado">Ejecutado</option>
        </select>
      </label>
      {/* Comprometido → orden opcional · Ejecutado → orden y comprobante. Se conserva
          el valor del campo oculto para no perderlo al cambiar de estado. */}
      <label hidden={exempt}>Número de orden de pedido
        <input className="field" name="order" defaultValue={expense?.order ?? ""} required={!exempt && status === "Ejecutado"} placeholder={status === "Ejecutado" ? "Obligatorio para gasto ejecutado" : "Opcional para gasto comprometido"} />
      </label>
      <label hidden={exempt || status !== "Ejecutado"}>Número de comprobante
        <input className="field" name="receipt" defaultValue={expense?.receipt ?? ""} required={!exempt && status === "Ejecutado"} placeholder="Obligatorio para gasto ejecutado" />
      </label>
    </div>
    <div className="stack-top"><InfoBox>{exempt
      ? <>El tipo <b>{type}</b> no lleva orden de pedido ni comprobante.</>
      : lockCore
      ? <>Un gasto <b>ejecutado</b> conserva su mes, proveedor, tipo y valor. Aquí solo puedes completar o corregir la orden de pedido y el comprobante.</>
      : <>Para gastos <b>comprometidos</b>, la orden de pedido es opcional. Para gastos <b>ejecutados</b>, la orden de pedido y el número de comprobante son obligatorios.</>}</InfoBox></div>
  </Modal>;
}
