/* =========================================================================
   Vista: Cambio obligatorio de contraseña (primer ingreso o restablecimiento)
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { icons } from "@/components/icons";
import { useStore } from "@/store/apiStore";
import logoColor from "@/assets/brand/POSITIVO-HORIZONTAL-COLOR.png";

// Misma política que valida el servidor.
function policyError(next: string, current: string): string | null {
  if (next.length < 8) return "La nueva contraseña debe tener al menos 8 caracteres.";
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return "La nueva contraseña debe incluir letras y números.";
  if (next === current) return "La nueva contraseña debe ser distinta de la actual.";
  return null;
}

export function ChangePasswordPage() {
  const { activeUser, changePassword, logout } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const current = String(data.get("current") ?? "");
    const next = String(data.get("next") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    const invalid = policyError(next, current) ?? (next !== confirm ? "La confirmación no coincide con la nueva contraseña." : null);
    if (invalid) { setError(invalid); return; }
    setError(null);
    setLoading(true);
    const result = await changePassword(current, next);
    setLoading(false);
    if (!result.ok) setError(result.message ?? "No fue posible cambiar la contraseña.");
  };

  return <main className="login-shell">
    <section className="login-panel">
      <div className="login-brand">
        <img src={logoColor} alt="Universidad de La Sabana" />
        <span>Jefatura de Innovación</span>
      </div>
      <div>
        <div className="eyebrow">Seguridad de la cuenta</div>
        <h1>Cambia tu contraseña</h1>
        <p className="subtitle">Hola{activeUser ? `, ${activeUser.name}` : ""}. Tu contraseña actual es temporal. Por seguridad, define una contraseña propia antes de continuar.</p>
      </div>
      <form className="login-form" onSubmit={(e) => { void onSubmit(e); }}>
        <label>Contraseña actual<input className="field" name="current" type="password" autoComplete="current-password" required disabled={loading} /></label>
        <label>Nueva contraseña<input className="field" name="next" type="password" autoComplete="new-password" minLength={8} required disabled={loading} aria-describedby="pwd-policy" /></label>
        <label>Confirmar nueva contraseña<input className="field" name="confirm" type="password" autoComplete="new-password" minLength={8} required disabled={loading} /></label>
        <p className="help" id="pwd-policy">Mínimo 8 caracteres, con letras y números, y distinta de la actual.</p>
        {error && <p className="login-error" role="alert">{error}</p>}
        <div className="login-actions">
          <button className="button secondary" type="button" onClick={logout} disabled={loading}>Cancelar y salir</button>
          <button className="button" type="submit" disabled={loading}><icons.lock /> {loading ? "Guardando…" : "Guardar y continuar"}</button>
        </div>
      </form>
    </section>
  </main>;
}
