import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { getSetupStatus } from '../services/auth.js';
import FormField from '../components/molecules/FormField.jsx';
import { mapFieldErrors } from '../utils/formErrors.js';

/** Formulario de inicio de sesion. */
export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  const redirectTo = location.state?.from || '/panel';

  // Si la instalacion todavia no tiene administrador, se ofrece el acceso a la
  // configuracion inicial. Un fallo de red aqui nunca debe romper el acceso.
  useEffect(() => {
    let cancelled = false;
    getSetupStatus()
      .then((data) => {
        if (!cancelled) setNeedsSetup(Boolean(data.needsFirstAdmin));
      })
      .catch(() => {
        if (!cancelled) setNeedsSetup(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setFieldErrors({});

    try {
      await signIn(form);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFieldErrors(mapFieldErrors(error));
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page auth">
      <h2 className="page__title">Iniciar sesion</h2>
      <p className="page__text">Accede con tu cuenta de estudiante o de administrador.</p>

      <form className="card form" onSubmit={handleSubmit} noValidate>
        {message && (
          <div className="status status--error" role="alert">
            {message}
          </div>
        )}

        <FormField label="Correo electronico" name="email" error={fieldErrors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </FormField>

        <FormField label="Contraseña" name="password" error={fieldErrors.password}>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </FormField>

        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Entrando...' : 'Iniciar sesion'}
        </button>

        <p className="form__footer">
          <Link to="/recuperar-password">Olvide mi contraseña</Link>
          <span aria-hidden="true"> &middot; </span>
          <Link to="/registro">Crear una cuenta</Link>
        </p>

        {needsSetup && (
          <p className="hint">
            ¿Primera vez en esta instalacion? <Link to="/configuracion-inicial">Configura el administrador</Link>.
          </p>
        )}
      </form>
    </section>
  );
}
