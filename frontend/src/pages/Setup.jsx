import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { createFirstAdmin, getSetupStatus } from '../services/auth.js';
import { mapFieldErrors } from '../utils/formErrors.js';

import FormField from '../components/molecules/FormField.jsx';
import StatusMessage from '../components/molecules/StatusMessage.jsx';

const emptyForm = () => ({ firstName: '', lastName: '', email: '', password: '', passwordConfirm: '' });

/**
 * STUDIA - Configuracion inicial
 * ------------------------------------------------------------------
 * Pantalla publica que permite crear el PRIMER administrador cuando la base de
 * datos todavia no tiene ninguno (instalacion recien importada). Si ya existe
 * un administrador, informa de que la configuracion esta completa y enlaza al
 * acceso.
 */
export default function Setup() {
  const navigate = useNavigate();

  const [status, setStatus] = useState({ loading: true, needsFirstAdmin: false, error: null });
  const [form, setForm] = useState(emptyForm());
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getSetupStatus()
      .then((data) => {
        if (!cancelled) setStatus({ loading: false, needsFirstAdmin: Boolean(data.needsFirstAdmin), error: null });
      })
      .catch((error) => {
        if (!cancelled) setStatus({ loading: false, needsFirstAdmin: false, error: error.message });
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
      await createFirstAdmin(form);
      setDone(true);
      setMessage('Cuenta de administrador creada. Ya puedes iniciar sesion.');
    } catch (error) {
      setFieldErrors(mapFieldErrors(error));
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status.loading) {
    return (
      <section className="page auth">
        <h2 className="page__title">Configuracion inicial</h2>
        <p className="page__text">Comprobando el estado de la instalacion...</p>
      </section>
    );
  }

  // Ya existe un administrador (o no se pudo consultar el estado).
  if (!status.needsFirstAdmin) {
    return (
      <section className="page auth">
        <h2 className="page__title">Configuracion inicial</h2>
        <p className="page__text">
          Esta pantalla solo esta disponible en una instalacion sin administradores.
        </p>

        {status.error && (
          <div style={{ marginBottom: '1rem' }}>
            <StatusMessage type="error">{status.error}</StatusMessage>
          </div>
        )}

        <div className="card form">
          <p className="page__text">
            La configuracion ya esta completa: existe al menos una cuenta de administrador.
          </p>
          <p className="form__footer">
            <Link to="/iniciar-sesion">Ir a iniciar sesion</Link>
          </p>
        </div>
      </section>
    );
  }

  if (done) {
    return (
      <section className="page auth">
        <h2 className="page__title">Configuracion inicial</h2>
        <div className="card form">
          <StatusMessage type="ok">{message}</StatusMessage>
          <button type="button" className="button" onClick={() => navigate('/iniciar-sesion', { replace: true })}>
            Iniciar sesion
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page auth">
      <h2 className="page__title">Configuracion inicial</h2>
      <p className="page__text">
        Todavia no existe ninguna cuenta de administrador. Crea la primera para poder gestionar la
        plataforma.
      </p>

      <form className="card form" onSubmit={handleSubmit} noValidate>
        {message && <StatusMessage type="error">{message}</StatusMessage>}

        <div className="grid grid--2" style={{ gap: '1rem' }}>
          <FormField label="Nombre" name="firstName" error={fieldErrors.firstName}>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              maxLength={80}
              value={form.firstName}
              onChange={handleChange}
              data-autofocus
              required
            />
          </FormField>

          <FormField label="Apellido" name="lastName" error={fieldErrors.lastName}>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              maxLength={80}
              value={form.lastName}
              onChange={handleChange}
              required
            />
          </FormField>
        </div>

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

        <FormField
          label="Contraseña"
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

        <FormField label="Confirmar contraseña" name="passwordConfirm" error={fieldErrors.passwordConfirm}>
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
          {submitting ? 'Creando...' : 'Crear administrador'}
        </button>

        <p className="form__footer">
          <Link to="/iniciar-sesion">Ya tengo una cuenta</Link>
        </p>
      </form>
    </section>
  );
}
