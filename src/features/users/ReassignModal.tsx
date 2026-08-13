/* =========================================================================
   Modal: reasignar proyectos antes de eliminar a un líder
   ========================================================================= */
import { type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { InfoBox } from "@/components/ui";
import { icons } from "@/components/icons";
import { useStore, type User } from "@/store/apiStore";
import { useToast } from "@/components/Toast";

export function ReassignModal({ user, projectCount, onClose }: { user: User; projectCount: number; onClose: () => void }) {
  const { users, reassignAndDeleteUser } = useStore();
  const { notify } = useToast();
  const leaders = users.filter((item) => item.active && item.role === "LIDER_PROYECTO" && item.id !== user.id);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const result = await reassignAndDeleteUser(user.id, data.leaderUserId);
    if (!result.ok) { notify(result.message ?? "No fue posible reasignar.", true); return; }
    onClose();
    notify(result.message ?? "Proyectos reasignados y usuario eliminado.");
  };

  return <Modal
    title="Reasignar proyectos"
    eyebrow="Usuarios"
    onClose={onClose}
    onSubmit={(e) => { void onSubmit(e); }}
    footer={<>
      <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
      <button className="button danger" type="submit"><icons.trash /> Reasignar y eliminar</button>
    </>}
  >
    <InfoBox cream>{user.name} tiene {projectCount} proyecto{projectCount === 1 ? "" : "s"} asignado{projectCount === 1 ? "" : "s"}. Selecciona el nuevo responsable para continuar con la eliminación.</InfoBox>
    <div className="form-grid" style={{ marginTop: 18 }}>
      <label className="wide">Nuevo líder
        <select className="field" name="leaderUserId" defaultValue={leaders[0]?.id}>
          {leaders.map((leader) => <option key={leader.id} value={leader.id}>{leader.name}</option>)}
        </select>
      </label>
    </div>
  </Modal>;
}
