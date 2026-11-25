import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { listUsers, updateUser, updateUserStatus } from '../services/auth.js';

const STATUS_LABELS = {
  pending: 'Pendiente',
  active: 'Activa',
  suspended: 'Suspendida',
  deleted: 'Eliminada',
};

const ROLE_LABELS = { student: 'Estudiante', tutor: 'Tutor', admin: 'Administrador' };

/**
 * Panel de administracion de usuarios.
 * Solo accesible para el rol admin (guarda de ruta) y protegido en el backend
 * por el middleware requireAdmin: aunque se manipule la URL, la API responde 403.
 */
export default function AdminUsers() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ role: '', status: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listUsers({
        page,
        limit: pagination.limit,
        ...(filters.role ? { role: filters.role } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      });
      setUsers(data.users);
      setPagination(data.pagination);
      setMessage(null);
    } catch (error) {
      setUsers([]);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
    // pagination.limit es estable; se omite a proposito para evitar bucles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setPage(1);
    setFilters((previous) => ({ ...previous, [name]: value }));
  };

  const handleStatusChange = async (uuid, status) => {
    setMessage(null);
    try {
      await updateUserStatus(uuid, status);
      setMessage({ type: 'ok', text: `Estado actualizado a "${STATUS_LABELS[status]}".` });
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // Cambia el rol de una cuenta (por ejemplo, ascender a un alumno a tutor).
  const handleRoleChange = async (uuid, role) => {
    setMessage(null);
    try {
      await updateUser(uuid, { role });
      setMessage({ type: 'ok', text: `Rol actualizado a "${ROLE_LABELS[role]}".` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      // Se recarga siempre para reflejar el valor real guardado en el servidor.
      await load();
    }
  };

  return (
    <section className="page page--wide">
      <h2 className="page__title">Administracion de usuarios</h2>
      <p className="page__text">
        Consulta las cuentas registradas, activa o suspende su acceso y ajusta su rol (estudiante,
        tutor o administrador). Esta pantalla solo esta disponible para administradores.
      </p>

      {message && (
        <div className={`status status--${message.type === 'ok' ? 'ok' : 'error'}`} role="status">
          {message.text}
        </div>
      )}

      <div className="card">
        <div className="form__row form__row--filters">
          <FormSelect label="Rol" name="role" value={filters.role} onChange={handleFilterChange}>
            <option value="">Todos</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FormSelect>

          <FormSelect label="Estado" name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FormSelect>
        </div>
      </div>

      {loading ? (
        <div className="status status--loading">Cargando usuarios...</div>
      ) : (
        <div className="card">
          <table className="table table--grid">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Alta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => {
                const isSelf = item.uuid === currentUser?.uuid;
                return (
                  <tr key={item.uuid}>
                    <td>
                      {item.firstName} {item.lastName} {isSelf && <span className="badge">tu</span>}
                    </td>
                    <td>{item.email}</td>
                    <td>{ROLE_LABELS[item.role] || item.role}</td>
                    <td>
                      <span className={`badge badge--${item.status}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td>
                      {isSelf ? (
                        <span className="hint">No editable</span>
                      ) : (
                        <div className="actions actions--inline">
                          {item.status !== 'active' && (
                            <button
                              type="button"
                              className="button button--small"
                              onClick={() => handleStatusChange(item.uuid, 'active')}
                            >
                              Activar
                            </button>
                          )}
                          {item.status === 'active' && (
                            <button
                              type="button"
                              className="button button--small button--danger"
                              onClick={() => handleStatusChange(item.uuid, 'suspended')}
                            >
                              Suspender
                            </button>
                          )}
                          <label
                            className="hint"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            Rol
                            <select
                              value={item.role}
                              aria-label={`Rol de ${item.firstName} ${item.lastName}`}
                              onChange={(event) => handleRoleChange(item.uuid, event.target.value)}
                            >
                              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" className="hint">
                    No hay usuarios que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="pagination">
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
            >
              Anterior
            </button>
            <span>
              Pagina {pagination.page} de {pagination.totalPages || 1} &middot; {pagination.total} usuarios
            </span>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => setPage((current) => Math.min(pagination.totalPages || 1, current + 1))}
              disabled={page >= (pagination.totalPages || 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <p className="hint">
        <Link to="/docencia">Ir a Docencia</Link> · <Link to="/panel">Volver al panel</Link>
      </p>
    </section>
  );
}

/** Select con etiqueta, usado solo en esta pantalla. */
function FormSelect({ label, name, value, onChange, children }) {
  return (
    <div className="form-field">
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} value={value} onChange={onChange}>
        {children}
      </select>
    </div>
  );
}
