/* =========================================================================
   Modal: registrar / corregir / duplicar gasto
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { InfoBox } from "@/components/ui";
import { useStore, type Cycle, type Expense, type Project } from "@/store/apiStore";
import { useToast } from "@/components/Toast";
import { expenseMonths } from "@/lib/format";
import type { ExpenseStatus } from "@/lib/types";

interface Props {
  project: Project;
  cycle: Cycle;
  expense?: Expense | null;
  duplicate?: boolean;
  onClose: () => void;
}

export function ExpenseModal({ project, cycle, expense = null, duplicate = false, onClose }: Props) {
  const { expenseTypes, saveExpense } = useStore();
  const { notify } = useToast();

  const selectedMonth = expense?.date?.slice(5, 7) || new Date().toISOString().slice(5, 7);
  const lockStatus = expense?.status === "Ejecutado" && !duplicate;
  const [status, setStatus] = useState<ExpenseStatus>(expense?.status ?? "Comprometido");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const targetId = duplicate ? null : expense?.id ?? null;
    const result = await saveExpense(project.id, cycle.id, targetId, {
      month: data.month,
      provider: data.provider.trim(),
      type: data.type,
      value: Number(data.value),
      status,
      order: (data.order ?? "").trim(),
      receipt: (data.receipt ?? "").trim(),
    });
    if (!result.ok) { notify(result.message ?? "No fue posible guardar el gasto.", true); return; }
    onClose();
    notify(result.message ?? "Gasto guardado.");
  };

  const title = duplicate ? "Duplicar gasto" : expense ? "Corregir gasto" : "Registrar gasto";

  return <Modal
    title={title}
    eyebrow={`Vigencia ${cycle.year} · ${project.name}`}
    onClose={onClose}
    onSubmit={(e) => { void onSubmit(e); }}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button" type="submit">{title}</button>
    </>}
  >
    <div className="form-grid">
      <label>Mes<select className="field" name="month" required defaultValue={selectedMonth}>{expenseMonths.map((month, index) => {
        const value = String(index + 1).padStart(2, "0");
        return <option key={value} value={value}>{month}</option>;
      })}</select></label>
      <label>Proveedor<input className="field" name="provider" required defaultValue={expense?.provider ?? ""} /></label>
      <label>Tipo de gasto<select className="field" name="type" required defaultValue={expense?.type ?? expenseTypes[0]}>{expenseTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Valor (COP)<input className="field" name="value" type="number" min={1} required defaultValue={expense?.value ?? ""} /></label>
      <label>Estado
        <select className="field" name="statusDisplay" value={status} onChange={(e) => setStatus(e.target.value as ExpenseStatus)} disabled={lockStatus}>
          <option value="Comprometido">Comprometido</option>
          <option value="Ejecutado">Ejecutado</option>
        </select>
      </label>
      {/* Comprometido → orden opcional · Ejecutado → orden y comprobante. Se conserva
          el valor del campo oculto para no perderlo al cambiar de estado. */}
      <label>Número de orden de pedido
        <input className="field" name="order" defaultValue={expense?.order ?? ""} required={status === "Ejecutado"} placeholder={status === "Ejecutado" ? "Obligatorio para gasto ejecutado" : "Opcional para gasto comprometido"} />
      </label>
      <label style={{ display: status === "Ejecutado" ? "" : "none" }}>Número de comprobante
        <input className="field" name="receipt" defaultValue={expense?.receipt ?? ""} required={status === "Ejecutado"} placeholder="Obligatorio para gasto ejecutado" />
      </label>
    </div>
    <div style={{ marginTop: 18 }}><InfoBox>Para gastos <b>comprometidos</b>, la orden de pedido es opcional. Para gastos <b>ejecutados</b>, la orden de pedido y el número de comprobante son obligatorios.</InfoBox></div>
  </Modal>;
}
