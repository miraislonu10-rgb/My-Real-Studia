import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { resetPassword } from '../services/auth.js';
import FormField from '../components/molecules/FormField.jsx';
import { mapFieldErrors, validatePassword } from '../utils/formErrors.js';

/**
 * Restablecimiento de contraseña a partir del enlace recibido por correo.
 * El token viaja en la URL (?token=...) y es de un solo uso.
 */
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ password: '', passwordConfirm: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    const errors = {};
    const passwordError = validatePassword(form.password);
    if (passwordError) errors.password = passwordError;
    else if (form.password !== form.passwordConfirm) {
      errors.passwordConfirm = 'Las contraseñas no coinciden.';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await resetPassword({ token, ...form });
      navigate('/iniciar-sesion', {
        replace: true,
        state: { notice: 'Contraseña actualizada. Inicia sesion con tu nueva contraseña.' },
      });
    } catch (error) {
      setFieldErrors(mapFieldErrors(error));
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <section className="page auth">
        <h2 className="page__title">Enlace no valido</h2>
        <div className="status status--error">
          Este enlace no incluye un token de recuperacion. Solicita uno nuevo.
        </div>
        <p className="form__footer">
          <Link to="/recuperar-password">Solicitar un enlace nuevo</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="page auth">
      <h2 className="page__title">Nueva contraseña</h2>
      <p className="page__text">
        Elige una contraseña nueva. Al guardarla se cerraran todas tus sesiones abiertas.
      </p>

      <form className="card form" onSubmit={handleSubmit} noValidate>
        {message && (
          <div className="status status--error" role="alert">
            {message}
          </div>
        )}

        <FormField
          label="Nueva contraseña"
          name="password"
          error={fieldErrors.password}
          hint="Minimo 8 caracteres, con al menos una letra y un numero."
        >
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </FormField>

        <FormField label="Repite la contraseña" name="passwordConfirm" error={fieldErrors.passwordConfirm}>
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            value={form.passwordConfirm}
            onChange={handleChange}
            required
          />
        </FormField>

        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
    </section>
  );
}
