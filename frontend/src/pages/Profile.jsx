import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { getMyProfile, updateMyProfile, updateMyAccount, deleteMyAccount } from '../services/auth.js';
import ConfirmDialog from '../components/molecules/ConfirmDialog.jsx';
import FormField from '../components/molecules/FormField.jsx';
import { mapFieldErrors } from '../utils/formErrors.js';

const EDUCATION_LEVELS = [
  { value: '', label: 'Sin definir' },
  { value: 'primary', label: 'Primaria' },
  { value: 'secondary', label: 'Secundaria' },
  { value: 'high_school', label: 'Bachillerato' },
  { value: 'undergraduate', label: 'Licenciatura' },
  { value: 'postgraduate', label: 'Posgrado' },
  { value: 'self_taught', label: 'Autodidacta' },
];

const toFormState = (profile) => ({
  educationLevel: profile?.educationLevel || '',
  institution: profile?.institution || '',
  academicProgram: profile?.academicProgram || '',
  gradeLevel: profile?.gradeLevel || '',
  mainGoal: profile?.mainGoal || '',
  dailyGoalMinutes: profile?.dailyGoalMinutes ?? 60,
});

const toAccountState = (user) => ({
  firstName: user?.firstName || '',
  lastName: user?.lastName || '',
  email: user?.email || '',
});

/**
 * Perfil del estudiante.
 * Usa exclusivamente los endpoints /users/me/... que operan sobre el usuario
 * autenticado: no hay ningun identificador en la URL que pueda manipularse
 * para intentar ver o editar el perfil de otra persona.
 */
export default function Profile() {
  const { user, refreshUser, signOut } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(toFormState(null));
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [account, setAccount] = useState(toAccountState(null));
  const [accountErrors, setAccountErrors] = useState({});
  const [accountMessage, setAccountMessage] = useState(null);
  const [accountSaving, setAccountSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getMyProfile()
      .then((profile) => {
        if (!cancelled) setForm(toFormState(profile));
      })
      .catch((error) => {
        if (!cancelled) setMessage({ type: 'error', text: error.message });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Mantiene el formulario de la cuenta en sincronia con el usuario en sesion.
  useEffect(() => {
    setAccount(toAccountState(user));
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const updated = await updateMyProfile({
        ...form,
        dailyGoalMinutes: Number(form.dailyGoalMinutes) || 60,
      });
      setForm(toFormState(updated));
      setMessage({ type: 'ok', text: 'Perfil actualizado correctamente.' });
    } catch (error) {
      setFieldErrors(mapFieldErrors(error));
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------- Cuenta (self)
  const handleAccountChange = (event) => {
    const { name, value } = event.target;
    setAccount((previous) => ({ ...previous, [name]: value }));
  };

  const handleAccountSubmit = async (event) => {
    event.preventDefault();
    setAccountMessage(null);
    setAccountErrors({});
    setAccountSaving(true);

    try {
      await updateMyAccount({
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
      });
      await refreshUser();
      setAccountMessage({ type: 'ok', text: 'Cuenta actualizada correctamente.' });
    } catch (error) {
      setAccountErrors(mapFieldErrors(error));
      setAccountMessage({ type: 'error', text: error.message });
    } finally {
      setAccountSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount();
      // La cuenta queda inactiva y las sesiones revocadas: salimos al inicio.
      await signOut().catch(() => {});
      navigate('/', { replace: true });
    } catch (error) {
      setAccountMessage({ type: 'error', text: error.message });
      setDeleteOpen(false);
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="status status--loading">Cargando tu perfil...</div>;
  }

  return (
    <section className="page">
      <h2 className="page__title">Mi perfil</h2>
      <p className="page__text">
        Estos datos son privados: solo tu (y un administrador) pueden consultarlos.
      </p>

      <form className="card form" onSubmit={handleAccountSubmit} noValidate>
        <h3>Datos de la cuenta</h3>
        <p className="hint">Puedes cambiar tu nombre y tu correo de acceso.</p>

        {accountMessage && (
          <div
            className={`status status--${accountMessage.type === 'ok' ? 'ok' : 'error'}`}
            role="status"
          >
            {accountMessage.text}
          </div>
        )}

        <div className="form__row">
          <FormField label="Nombre" name="firstName" error={accountErrors.firstName}>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              value={account.firstName}
              onChange={handleAccountChange}
            />
          </FormField>

          <FormField label="Apellido" name="lastName" error={accountErrors.lastName}>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              value={account.lastName}
              onChange={handleAccountChange}
            />
          </FormField>
        </div>

        <FormField label="Correo" name="email" error={accountErrors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={account.email}
            onChange={handleAccountChange}
          />
        </FormField>

        <div className="actions">
          <button type="submit" className="button" disabled={accountSaving}>
            {accountSaving ? 'Guardando...' : 'Guardar cuenta'}
          </button>
        </div>
      </form>

      <form className="card form" onSubmit={handleSubmit} noValidate>
        <h3>Perfil academico</h3>

        {message && (
          <div className={`status status--${message.type === 'ok' ? 'ok' : 'error'}`} role="status">
            {message.text}
          </div>
        )}

        <FormField label="Nivel educativo" name="educationLevel" error={fieldErrors.educationLevel}>
          <select id="educationLevel" name="educationLevel" value={form.educationLevel} onChange={handleChange}>
            {EDUCATION_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </FormField>

        <div className="form__row">
          <FormField label="Institucion" name="institution" error={fieldErrors.institution}>
            <input id="institution" name="institution" type="text" value={form.institution} onChange={handleChange} />
          </FormField>

          <FormField label="Programa academico" name="academicProgram" error={fieldErrors.academicProgram}>
            <input
              id="academicProgram"
              name="academicProgram"
              type="text"
              value={form.academicProgram}
              onChange={handleChange}
            />
          </FormField>
        </div>

        <div className="form__row">
          <FormField label="Grado o semestre" name="gradeLevel" error={fieldErrors.gradeLevel}>
            <input id="gradeLevel" name="gradeLevel" type="text" value={form.gradeLevel} onChange={handleChange} />
          </FormField>

          <FormField
            label="Meta diaria (minutos)"
            name="dailyGoalMinutes"
            error={fieldErrors.dailyGoalMinutes}
            hint="Entre 10 y 1440 minutos."
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
        </div>

        <FormField label="Objetivo principal" name="mainGoal" error={fieldErrors.mainGoal}>
          <input id="mainGoal" name="mainGoal" type="text" value={form.mainGoal} onChange={handleChange} />
        </FormField>

        <div className="actions">
          <button type="submit" className="button" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <Link className="button button--ghost" to="/panel">
            Volver al panel
          </Link>
        </div>
      </form>

      <div className="card">
        <h3>Eliminar cuenta</h3>
        <p className="hint">
          Tu cuenta quedará desactivada y se cerrarán todas tus sesiones. Tus datos académicos se
          conservan por integridad del sistema. Esta acción no se puede deshacer desde aquí.
        </p>
        <div className="actions">
          <button
            type="button"
            className="button button--danger"
            onClick={() => setDeleteOpen(true)}
          >
            Eliminar mi cuenta
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar cuenta"
        text="¿Seguro que quieres eliminar tu cuenta? Se cerrarán todas tus sesiones y no podrás volver a iniciar sesión."
        confirmLabel="Sí, eliminar mi cuenta"
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteOpen(false)}
        loading={deleting}
      />
    </section>
  );
}
