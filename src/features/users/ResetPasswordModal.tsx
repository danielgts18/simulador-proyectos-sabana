/* =========================================================================
   Modal: contraseña temporal generada al restablecer (se muestra una sola vez)
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { InfoBox } from "@/components/ui";
import { icons } from "@/components/icons";
import { useToast } from "@/components/Toast";
import type { User } from "@/store/apiStore";

export function ResetPasswordModal({ user, temporaryPassword, onClose }: { user: User; temporaryPassword: string; onClose: () => void }) {
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
    } catch {
      notify("No fue posible copiar; selecciona y copia la contraseña manualmente.", true);
    }
  };

  return <Modal
    title="Contraseña restablecida"
    eyebrow="Usuarios"
    onClose={onClose}
    onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); onClose(); }}
    footer={<button className="button" type="submit">Listo</button>}
  >
    <InfoBox cream>
      Se generó una contraseña temporal para <strong>{user.name}</strong> ({user.username}). Compártela por un canal seguro:
      no se volverá a mostrar y, al ingresar, el usuario deberá definir una contraseña propia.
    </InfoBox>
    <div className="form-grid stack-top">
      <label className="wide">Contraseña temporal
        <input className="field mono" readOnly value={temporaryPassword} onFocus={(e) => e.currentTarget.select()} />
      </label>
    </div>
    <div className="stack-top">
      <button type="button" className="button secondary sm" onClick={() => { void copy(); }}><icons.copy /> {copied ? "Copiada" : "Copiar"}</button>
    </div>
  </Modal>;
}
