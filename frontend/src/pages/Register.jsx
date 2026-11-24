import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import FormField from '../components/molecules/FormField.jsx';
import { mapFieldErrors, validateEmail, validatePassword } from '../utils/formErrors.js';

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirm: '',
  dailyGoalMinutes: 60,
};

/**
 * Registro publico de estudiantes.
 * No existe campo de rol a proposito: el backend crea siempre role='student'.
 * La cuenta de administrador se crea con el script del servidor
 * (backend/scripts/createAdmin.js), nunca desde este formulario.
 */
export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  /** Validacion local (inmediata). El servidor vuelve a validar todo. */
  const validateLocally = () => {
    const errors = {};

    if (form.firstName.trim().length < 2) errors.firstName = 'Indica tu nombre.';
    if (form.lastName.trim().length < 2) errors.lastName = 'Indica tu apellido.';

    const emailError = validateEmail(form.email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(form.password);
    if (passwordError) errors.password = passwordError;
    else if (form.password !== form.passwordConfirm) {
      errors.passwordConfirm = 'Las contraseñas no coinciden.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!validateLocally()) return;

    setSubmitting(true);
    try {
      await signUp({
        ...form,
        dailyGoalMinutes: Number(form.dailyGoalMinutes) || 60,
      });
      navigate('/panel', { replace: true });
    } catch (error) {
      setFieldErrors((previous) => ({ ...previous, ...mapFieldErrors(error) }));
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page auth">
      <h2 className="page__title">Crear cuenta de estudiante</h2>
      <p className="page__text">
        Crea tu cuenta para organizar materias, sesiones de estudio y tareas.
      </p>

      <form className="card form" onSubmit={handleSubmit} noValidate>
        {message && (
          <div className="status status--error" role="alert">
            {message}
          </div>
        )}

        <div className="form__row">
          <FormField label="Nombre" name="firstName" error={fieldErrors.firstName}>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              value={form.firstName}
              onChange={handleChange}
              required
            />
          </FormField>

          <FormField label="Apellido" name="lastName" error={fieldErrors.lastName}>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
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

        <div className="form__row">
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
        </div>

        <FormField
          label="Meta diaria de estudio (minutos)"
          name="dailyGoalMinutes"
          error={fieldErrors.dailyGoalMinutes}
          hint="Entre 10 y 1440 minutos. Podras cambiarla despues."
        >
          <input
            id="dailyGoalMinutes"
            name="dailyGoalMinutes"
            type="number"
            min="10"
            max="1440"
            value={form.dailyGoalMinutes}
            onChange={handleChange}
          />
        </FormField>

        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>

        <p className="form__footer">
          ¿Ya tienes cuenta? <Link to="/iniciar-sesion">Inicia sesion</Link>
        </p>
      </form>
    </section>
  );
}
