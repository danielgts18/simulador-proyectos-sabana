/* =========================================================================
   Modal: registrar / corregir / duplicar gasto
   ========================================================================= */
import { type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { InfoBox } from "@/components/ui";
import { useStore } from "@/store/store";
import { useToast } from "@/components/Toast";
import { expenseMonths } from "@/lib/format";
import type { Cycle, Expense, ExpenseStatus, Project } from "@/lib/types";

interface Props {
  project: Project;
  cycle: Cycle;
  expense?: Expense | null;
  duplicate?: boolean;
  onClose: () => void;
}

export function ExpenseModal({ project, cycle, expense = null, duplicate = false, onClose }: Props) {
  const { state, saveExpense } = useStore();
  const { notify } = useToast();

  const selectedMonth = expense?.date?.slice(5, 7) || new Date().toISOString().slice(5, 7);
  const lockStatus = expense?.status === "Ejecutado" && !duplicate;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const targetId = duplicate ? null : expense?.id ?? null;
    const result = saveExpense(project.id, cycle.id, targetId, {
      month: data.month,
      provider: data.provider.trim(),
      type: data.type,
      value: Number(data.value),
      status: (data.status as ExpenseStatus) || expense?.status || "Comprometido",
      order: (data.order ?? "").trim(),
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
    onSubmit={onSubmit}
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
      <label>Tipo de gasto<select className="field" name="type" required defaultValue={expense?.type ?? state.expenseTypes[0]}>{state.expenseTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Valor (COP)<input className="field" name="value" type="number" min={1} required defaultValue={expense?.value ?? ""} /></label>
      <label>Estado
        <select className="field" name="status" defaultValue={expense?.status ?? "Comprometido"} disabled={lockStatus}>
          <option>Comprometido</option>
          <option>Ejecutado</option>
        </select>
        {lockStatus && <input type="hidden" name="status" value="Ejecutado" />}
      </label>
      <label>Número de orden de pedido<input className="field" name="order" defaultValue={expense?.order ?? ""} placeholder="Obligatorio si es ejecutado" /></label>
    </div>
    <div style={{ marginTop: 18 }}><InfoBox>Selecciona el mes de la vigencia al que corresponde el gasto. La orden de pedido es obligatoria al ejecutar el gasto.</InfoBox></div>
  </Modal>;
}
