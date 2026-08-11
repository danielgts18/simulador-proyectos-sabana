/* =========================================================================
   Vista: Usuarios (cuentas locales y roles)
   ========================================================================= */
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useStore } from "@/store/store";
import { useToast } from "@/components/Toast";
import { icons } from "@/components/icons";
import { Badge } from "@/components/ui";
import { UserFormModal } from "@/features/users/UserFormModal";
import { ReassignModal } from "@/features/users/ReassignModal";
import { roleLabels, type User } from "@/lib/types";

type ModalState =
  | { kind: "create" }
  | { kind: "edit"; user: User }
  | { kind: "reassign"; user: User; projectCount: number }
  | null;

export function UsersPage() {
  const { state, activeUser, isJefatura, deleteUser } = useStore();
  const { notify } = useToast();
  const [modal, setModal] = useState<ModalState>(null);
  if (!isJefatura) return <Navigate to="/dashboard" replace />;

  const projectCountOf = (userId: number) => state.projects.filter((project) => project.leaderUserId === userId).length;

  const onDelete = (user: User) => {
    const count = projectCountOf(user.id);
    if (count > 0) { setModal({ kind: "reassign", user, projectCount: count }); return; }
    if (window.confirm(`Eliminar el usuario "${user.name}". Esta acción no se puede deshacer. ¿Continuar?`)) {
      const result = deleteUser(user.id);
      if (!result.ok) { notify(result.message ?? "No fue posible eliminar.", true); return; }
      notify("Usuario eliminado.");
    }
  };

  return <>
    <div className="page-head">
      <div className="titles">
        <div className="eyebrow">Administración</div>
        <h1>Usuarios</h1>
        <p className="subtitle">Cuentas locales y roles de acceso al seguimiento presupuestal.</p>
      </div>
      <button className="button" onClick={() => setModal({ kind: "create" })}><icons.plus /> Crear usuario</button>
    </div>

    <section className="panel">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {state.users.map((user) => <tr key={user.id}>
              <td><span className="cell-strong">{user.name}</span><span className="cell-sub">{user.username}</span></td>
              <td>{roleLabels[user.role]}</td>
              <td>{user.active ? <Badge value="Aprobado" /> : <span className="help">Inactivo</span>}</td>
              <td>
                <div className="expense-actions">
                  <button className="button subtle sm" onClick={() => setModal({ kind: "edit", user })}><icons.pencil /> Corregir</button>
                  {user.id === activeUser?.id
                    ? <span className="help">Sesión actual</span>
                    : <button className="button ghost-danger sm" onClick={() => onDelete(user)}><icons.trash /> Eliminar</button>}
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    {modal?.kind === "create" && <UserFormModal onClose={() => setModal(null)} />}
    {modal?.kind === "edit" && <UserFormModal user={modal.user} onClose={() => setModal(null)} />}
    {modal?.kind === "reassign" && <ReassignModal user={modal.user} projectCount={modal.projectCount} onClose={() => setModal(null)} />}
  </>;
}
