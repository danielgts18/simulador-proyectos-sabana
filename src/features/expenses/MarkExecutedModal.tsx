/* =========================================================================
   Modal: marcar un gasto comprometido como ejecutado
   Solo pide los soportes (orden de pedido y comprobante); el resto no cambia.
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { useStore, type Cycle, type Expense, type Project } from "@/store/apiStore";
import { useToast } from "@/components/Toast";
import { expenseMonth, money } from "@/lib/format";

export function MarkExecutedModal({ project, cycle, expense, onClose }: { project: Project; cycle: Cycle; expense: Expense; onClose: () => void }) {
  const { saveExpense } = useStore();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    setSaving(true);
    const result = await saveExpense(project.id, cycle.id, expense.id, {
      month: expense.date.slice(5, 7), provider: expense.provider, type: expense.type, value: expense.value,
      status: "Ejecutado", order: data.order.trim(), receipt: data.receipt.trim(),
    });
    setSaving(false);
    if (!result.ok) { notify(result.message ?? "No fue posible marcar el gasto como ejecutado.", true); return; }
    onClose();
    notify("Gasto marcado como ejecutado.");
  };

  return <Modal
    title="Marcar como ejecutado"
    eyebrow={`Vigencia ${cycle.year} · ${project.name}`}
    onClose={onClose}
    submitting={saving}
    onSubmit={(e) => { void onSubmit(e); }}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button" type="submit">{saving ? "Guardando…" : "Marcar como ejecutado"}</button>
    </>}
  >
    <dl className="definition">
      <div><dt>Mes</dt><dd>{expenseMonth(expense.date)}</dd></div>
      <div><dt>Valor</dt><dd>{money(expense.value)}</dd></div>
      <div><dt>Proveedor</dt><dd>{expense.provider}</dd></div>
      <div><dt>Tipo de gasto</dt><dd>{expense.type}</dd></div>
    </dl>
    <div className="form-grid stack-top">
      <label>Número de orden de pedido<input className="field" name="order" required defaultValue={expense.order} /></label>
      <label>Número de comprobante<input className="field" name="receipt" required defaultValue={expense.receipt} /></label>
    </div>
  </Modal>;
}
