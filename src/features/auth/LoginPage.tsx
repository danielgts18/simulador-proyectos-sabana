/* =========================================================================
   Vista: Acceso local
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { icons } from "@/components/icons";
import { useStore } from "@/store/store";
import logoColor from "@/assets/brand/POSITIVO-HORIZONTAL-COLOR.png";

export function LoginPage() {
  const { login, activeUser } = useStore();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (activeUser) return <Navigate to="/dashboard" replace />;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = login(String(data.get("username") ?? ""), String(data.get("password") ?? ""));
    if (!result.ok) { setError(result.message ?? "No fue posible ingresar."); return; }
    navigate("/dashboard");
  };

  return <main className="login-shell">
    <section className="login-panel">
      <div className="login-brand">
        <img src={logoColor} alt="Universidad de La Sabana" />
        <span>Jefatura de Innovación</span>
      </div>
      <div>
        <div className="eyebrow">Acceso local</div>
        <h1>Seguimiento presupuestal</h1>
        <p className="subtitle">Ingresa con tu usuario institucional asignado.</p>
      </div>
      <form className="login-form" onSubmit={onSubmit}>
        <label>Usuario<input className="field" name="username" autoComplete="username" required /></label>
        <label>Contraseña<input className="field" name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p className="login-error">{error}</p>}
        <button className="button" type="submit"><icons.lock /> Ingresar</button>
      </form>
      <p className="login-help">Demo: <b>jefatura</b>, <b>gestor</b> o <b>mariana</b> · contraseña <b>Sabana2026!</b></p>
    </section>
  </main>;
}
