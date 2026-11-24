import { useState } from 'react';
import { Link } from 'react-router-dom';

import { forgotPassword } from '../services/auth.js';
import FormField from '../components/molecules/FormField.jsx';
import { validateEmail } from '../utils/formErrors.js';

/**
 * Solicitud del enlace de recuperacion de contraseña.
 * Muestra siempre el mismo mensaje, exista o no la cuenta, igual que el
 * backend: asi no se puede averiguar que correos estan registrados.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    const emailError = validateEmail(email);
    if (emailError) {
      setFieldError(emailError);
      return;
    }
    setFieldError(null);

    setSubmitting(true);
    try {
      const response = await forgotPassword(email);
      setMessage({ type: 'ok', text: response.message });
      setEmail('');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page auth">
      <h2 className="page__title">Recuperar contraseña</h2>
      <p className="page__text">
        Escribe tu correo y te enviaremos un enlace para elegir una contraseña nueva.
      </p>

      {import.meta.env.DEV && (
        <p className="page__text">
          En desarrollo no se envian correos: el enlace de restablecimiento aparece en la
          consola del servidor del backend.
        </p>
      )}

      <form className="card form" onSubmit={handleSubmit} noValidate>
        {message && (
          <div className={`status status--${message.type === 'ok' ? 'ok' : 'error'}`} role="status">
            {message.text}
          </div>
        )}

        <FormField label="Correo electronico" name="email" error={fieldError}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </FormField>

        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Enviando...' : 'Enviar enlace'}
        </button>

        <p className="form__footer">
          <Link to="/iniciar-sesion">Volver al inicio de sesion</Link>
        </p>
      </form>
    </section>
  );
}
