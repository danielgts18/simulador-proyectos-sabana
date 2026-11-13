/* =========================================================================
   Vista: Catálogos (células y tipos de gasto)
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { useStore } from "@/store/apiStore";
import { useToast } from "@/components/Toast";
import { icons, Icon, type IconName } from "@/components/icons";
import { Modal, ConfirmModal } from "@/components/Modal";
import { PageHeader, EmptyState, AccessDenied } from "@/components/ui";

type CatalogType = "ecosystems" | "expenseTypes";

interface CardProps {
  title: string;
  subtitle: string;
  /** Nombre en singular para mensajes ("célula", "tipo de gasto"). */
  singular: string;
  icon: IconName;
  type: CatalogType;
  items: string[];
}

type CardModal = { kind: "add" } | { kind: "remove"; item: string } | null;

function CatalogCard({ title, subtitle, singular, icon, type, items }: CardProps) {
  const { addCatalog, deactivateCatalog, deleteCell, accessibleProjects, isJefatura, canManageProjects } = useStore();
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<CardModal>(null);
  const [busy, setBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const term = search.trim().toLowerCase();
  const visible = items.filter((item) => !term || item.toLowerCase().includes(term));
  const isCells = type === "ecosystems";
  // Eliminar una célula borra sus proyectos (solo gestor financiero); desactivar un tipo de gasto es de Jefatura.
  const canRemove = isCells ? canManageProjects : isJefatura;

  const onAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) return;
    if (items.some((item) => item.toLowerCase() === name.toLowerCase())) { setNameError(`«${name}» ya existe en ${title.toLowerCase()}.`); return; }
    setBusy(true);
    const result = await addCatalog(type, name);
    setBusy(false);
    if (!result.ok) { notify(result.message ?? "No fue posible agregar el registro.", true); return; }
    setModal(null);
    notify(isCells ? `Célula «${name}» creada.` : `Tipo de gasto «${name}» creado.`);
  };

  const onRemove = async (item: string) => {
    setBusy(true);
    const result = isCells ? await deleteCell(item) : await deactivateCatalog(type, item);
    setBusy(false);
    if (!result.ok) { notify(result.message ?? "No fue posible completar la acción.", true); return; }
    setModal(null);
    notify(isCells ? `Célula «${item}» eliminada.` : `Tipo de gasto «${item}» desactivado.`);
  };

  const projectCount = (cell: string) => accessibleProjects().filter((p) => p.ecosystem === cell).length;

  return <section className="panel">
    <div className="catalog-card-head">
      <span className="catalog-icon"><Icon name={icon} /></span>
      <div className="catalog-heading"><h2>{title}</h2><p>{subtitle}</p></div>
      <span className="pill tone-info no-dot">{items.length}</span>
    </div>
    <div className="catalog-toolbar">
      <div className="filters filter-search"><icons.search /><input type="search" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label={`Buscar en ${title}`} /></div>
      <button className="button sm" onClick={() => { setNameError(null); setModal({ kind: "add" }); }}><icons.plus /> Crear {singular}</button>
    </div>
    <div className="chip-set">
      {items.length === 0
        ? <EmptyState compact title={`Aún no hay ${title.toLowerCase()}`} />
        : visible.length === 0
          ? <EmptyState compact title="Ningún registro coincide con la búsqueda" />
          : visible.map((item) => <span key={item} className="chip">
            <span className="chip-label">{item}</span>
            {canRemove && <button className="chip-remove" onClick={() => setModal({ kind: "remove", item })} title={`${isCells ? "Eliminar" : "Desactivar"} ${item}`} aria-label={`${isCells ? "Eliminar" : "Desactivar"} ${item}`}>×</button>}
          </span>)}
    </div>

    {modal?.kind === "add" && <Modal
      title={`Crear ${singular}`}
      eyebrow="Administración · Catálogos"
      onClose={() => setModal(null)}
      submitting={busy}
      onSubmit={(e) => { void onAdd(e); }}
      footer={<>
        <button type="button" className="button secondary" onClick={() => setModal(null)}>Cancelar</button>
        <button className="button" type="submit">{busy ? "Guardando…" : `Crear ${singular}`}</button>
      </>}
    >
      <div className="form-grid">
        <label className="wide">Nombre<input className="field" name="name" required maxLength={100} aria-invalid={!!nameError} aria-describedby={nameError ? "catalog-name-error" : undefined} onChange={() => setNameError(null)} />
          {nameError && <span id="catalog-name-error" className="field-error">{nameError}</span>}
        </label>
      </div>
    </Modal>}
    {modal?.kind === "remove" && <ConfirmModal
      title={isCells ? "Eliminar célula" : "Desactivar tipo de gasto"}
      eyebrow="Administración · Catálogos"
      message={isCells
        ? <>Eliminar la célula <strong>{modal.item}</strong> borrará también {projectCount(modal.item) === 1 ? "su proyecto" : `sus ${projectCount(modal.item)} proyectos`} con todas sus vigencias y gastos. Esta acción no se puede deshacer.</>
        : <>El tipo <strong>{modal.item}</strong> dejará de estar disponible para nuevos gastos. Los gastos ya registrados con este tipo se conservan.</>}
      confirmLabel={isCells ? "Eliminar célula" : "Desactivar"}
      danger={isCells}
      submitting={busy}
      onConfirm={() => { void onRemove(modal.item); }}
      onClose={() => setModal(null)}
    />}
  </section>;
}

export function CatalogsPage() {
  const { ecosystems, expenseTypes, canManagePortfolio } = useStore();
  if (!canManagePortfolio) return <AccessDenied />;
  return <>
    <PageHeader eyebrow="Administración" title="Catálogos" subtitle="Células del portafolio y tipos para clasificar los gastos." />
    <div className="catalog-grid">
      <CatalogCard title="Células" singular="célula" subtitle="Agrupan los proyectos de innovación" icon="layers" type="ecosystems" items={ecosystems} />
      <CatalogCard title="Tipos de gasto" singular="tipo de gasto" subtitle="Clasifican cada gasto de las vigencias" icon="tags" type="expenseTypes" items={expenseTypes} />
    </div>
  </>;
}
