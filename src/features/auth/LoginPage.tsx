/* =========================================================================
   Vista: Acceso
   ========================================================================= */
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { icons } from "@/components/icons";
import { useStore } from "@/store/apiStore";
import logoColor from "@/assets/brand/POSITIVO-HORIZONTAL-COLOR.png";

export function LoginPage() {
  const { login, activeUser, sessionNotice } = useStore();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (activeUser) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    setLoading(true);
    const result = await login(String(data.get("username") ?? ""), String(data.get("password") ?? ""));
    setLoading(false);
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
        <div className="eyebrow">Acceso</div>
        <h1>Seguimiento presupuestal</h1>
        <p className="subtitle">Ingresa con tu usuario institucional asignado.</p>
      </div>
      <form className="login-form" onSubmit={(e) => { void onSubmit(e); }}>
        <label>Usuario<input className="field" name="username" autoComplete="username" required disabled={loading} /></label>
        <label>Contraseña<input className="field" name="password" type="password" autoComplete="current-password" required disabled={loading} /></label>
        {!error && sessionNotice && <p className="login-notice" role="status">{sessionNotice}</p>}
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="button" type="submit" disabled={loading}><icons.lock /> {loading ? "Ingresando…" : "Ingresar"}</button>
      </form>
    </section>
  </main>;
}
