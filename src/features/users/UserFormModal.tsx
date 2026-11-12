/* =========================================================================
   Modal: crear / corregir usuario
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { useStore, type User } from "@/store/apiStore";
import { useToast } from "@/components/Toast";
import type { Role } from "@/lib/types";

export function UserFormModal({ user, onClose }: { user?: User | null; onClose: () => void }) {
  const { createUser, updateUser } = useStore();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const payload = { name: data.name.trim(), username: data.username.trim(), role: data.role as Role, password: data.password || undefined };
    setSaving(true);
    const result = user ? await updateUser(user.id, payload) : await createUser(payload);
    setSaving(false);
    if (!result.ok) { notify(result.message ?? "No fue posible guardar el usuario.", true); return; }
    onClose();
    notify(user ? "Usuario actualizado." : "Usuario creado. Deberá cambiar la contraseña en su primer ingreso.");
  };

  return <Modal
    title={user ? "Corregir usuario" : "Crear usuario"}
    eyebrow="Acceso"
    onClose={onClose}
    submitting={saving}
    onSubmit={(e) => { void onSubmit(e); }}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button" type="submit">{saving ? "Guardando…" : user ? "Guardar correcciones" : "Crear usuario"}</button>
    </>}
  >
    <div className="form-grid">
      <label>Nombre completo<input className="field" name="name" required defaultValue={user?.name ?? ""} /></label>
      <label>Usuario<input className="field" name="username" required autoComplete="off" defaultValue={user?.username ?? ""} /></label>
      <label>{user ? "Nueva contraseña temporal" : "Contraseña temporal"}
        <input className="field" name="password" type="password" autoComplete="new-password" required={!user} placeholder={user ? "Dejar en blanco para conservar la actual" : ""} />
      </label>
      <label>Rol<select className="field" name="role" defaultValue={user?.role ?? "GESTOR_FINANCIERO"}>
        <option value="GESTOR_FINANCIERO">Gestor financiero</option>
        <option value="LIDER_PROYECTO">Líder de proyecto</option>
        <option value="JEFATURA">Jefatura</option>
      </select></label>
      <p className="help wide">La contraseña que asignes es temporal: el usuario deberá cambiarla al ingresar.</p>
    </div>
  </Modal>;
}
