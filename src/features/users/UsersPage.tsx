/* =========================================================================
   Vista: Usuarios (cuentas y roles)
   ========================================================================= */
import { useState } from "react";
import { useStore, type User } from "@/store/apiStore";
import { useToast } from "@/components/Toast";
import { icons } from "@/components/icons";
import { PageHeader, Badge, EmptyRow, AccessDenied } from "@/components/ui";
import { ConfirmModal } from "@/components/Modal";
import { UserFormModal } from "@/features/users/UserFormModal";
import { ReassignModal } from "@/features/users/ReassignModal";
import { ResetPasswordModal } from "@/features/users/ResetPasswordModal";
import { roleLabels } from "@/lib/types";

type ModalState =
  | { kind: "create" }
  | { kind: "edit"; user: User }
  | { kind: "delete"; user: User }
  | { kind: "confirm-reset"; user: User }
  | { kind: "reassign"; user: User; projectCount: number }
  | { kind: "reset"; user: User; temporaryPassword: string }
  | null;

export function UsersPage() {
  const { users, projects, activeUser, isJefatura, deleteUser, resetUserPassword } = useStore();
  const { notify } = useToast();
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);
  if (!isJefatura) return <AccessDenied />;

  const projectCountOf = (userId: string) => projects.filter((p) => p.leaderUserId === userId).length;

  const onDelete = (user: User) => {
    const count = projectCountOf(user.id);
    setModal(count > 0 ? { kind: "reassign", user, projectCount: count } : { kind: "delete", user });
  };

  const onConfirmDelete = async (user: User) => {
    setBusy(true);
    const result = await deleteUser(user.id);
    setBusy(false);
    if (!result.ok) { notify(result.message ?? "No fue posible eliminar el usuario.", true); return; }
    setModal(null);
    notify("Usuario eliminado.");
  };

  const onConfirmReset = async (user: User) => {
    setBusy(true);
    const result = await resetUserPassword(user.id);
    setBusy(false);
    if (!result.ok) { notify(result.message, true); return; }
    setModal({ kind: "reset", user, temporaryPassword: result.temporaryPassword });
  };

  return <>
    <PageHeader
      eyebrow="Administración"
      title="Usuarios"
      subtitle="Cuentas y roles de acceso al seguimiento presupuestal."
      actions={<button className="button" onClick={() => setModal({ kind: "create" })}><icons.plus /> Crear usuario</button>}
    />

    <section className="panel">
      <div className="panel-head">
        <h2><icons.user /> Cuentas</h2>
        <span className="help">{users.length} usuario{users.length === 1 ? "" : "s"}</span>
      </div>
      <div className="table-wrap table-cards">
        <table>
          <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {users.length === 0
              ? <EmptyRow colSpan={4} title="Aún no hay usuarios" />
              : users.map((user) => <tr key={user.id}>
                <td><span className="cell-strong">{user.name}</span><span className="cell-sub">{user.username}</span></td>
                <td data-label="Rol">{roleLabels[user.role]}</td>
                <td data-label="Estado">{user.active ? <Badge value="Activo" /> : <Badge value="Inactivo" />}</td>
                <td>
                  <div className="row-actions">
                    <button className="button subtle sm" onClick={() => setModal({ kind: "edit", user })} aria-label={`Corregir el usuario ${user.name}`}><icons.pencil /> Corregir</button>
                    {user.active && user.id !== activeUser?.id && <button className="button subtle sm" onClick={() => setModal({ kind: "confirm-reset", user })} aria-label={`Restablecer la contraseña de ${user.name}`}><icons.lock /> Restablecer contraseña</button>}
                    {user.id === activeUser?.id
                      ? <span className="muted-note">Sesión actual</span>
                      : <button className="button subtle ghost-danger sm" onClick={() => onDelete(user)} aria-label={`Eliminar el usuario ${user.name}`}><icons.trash /> Eliminar</button>}
                  </div>
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    {modal?.kind === "create" && <UserFormModal onClose={() => setModal(null)} />}
    {modal?.kind === "edit" && <UserFormModal user={modal.user} onClose={() => setModal(null)} />}
    {modal?.kind === "delete" && <ConfirmModal
      title="Eliminar usuario"
      eyebrow="Administración · Usuarios"
      message={<>Se eliminará el usuario <strong>{modal.user.name}</strong> ({modal.user.username}). Esta acción no se puede deshacer.</>}
      confirmLabel="Eliminar usuario"
      danger
      submitting={busy}
      onConfirm={() => { void onConfirmDelete(modal.user); }}
      onClose={() => setModal(null)}
    />}
    {modal?.kind === "confirm-reset" && <ConfirmModal
      title="Restablecer contraseña"
      eyebrow="Administración · Usuarios"
      message={<>Se generará una contraseña temporal para <strong>{modal.user.name}</strong> y la actual dejará de funcionar. En su próximo ingreso deberá definir una contraseña propia.</>}
      confirmLabel="Restablecer contraseña"
      submitting={busy}
      onConfirm={() => { void onConfirmReset(modal.user); }}
      onClose={() => setModal(null)}
    />}
    {modal?.kind === "reset" && <ResetPasswordModal user={modal.user} temporaryPassword={modal.temporaryPassword} onClose={() => setModal(null)} />}
    {modal?.kind === "reassign" && <ReassignModal user={modal.user} projectCount={modal.projectCount} onClose={() => setModal(null)} />}
  </>;
}
