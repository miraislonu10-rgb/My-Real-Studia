import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';

/**
 * STUDIA - Guardas de ruta del cliente
 * ------------------------------------------------------------------
 * Deciden QUE SE MUESTRA segun la sesion y el rol. La seguridad real la aplica
 * el backend: aunque alguien salte estas guardas manipulando la URL, la API
 * responde 401/403 porque cada peticion se autoriza en el servidor.
 */

/** Pantalla mostrada mientras se comprueba si hay sesion activa. */
const CheckingSession = () => (
  <div className="status status--loading" role="status">
    Comprobando la sesion...
  </div>
);

/** Solo para usuarios autenticados (cualquier rol). */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <CheckingSession />;
  if (!isAuthenticated) {
    // Se recuerda la ruta solicitada para volver a ella tras iniciar sesion.
    return <Navigate to="/iniciar-sesion" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/**
 * Solo para los roles indicados (por ejemplo, administrador).
 * Si el usuario esta autenticado pero no tiene el rol, se le muestra una
 * pantalla de acceso denegado en lugar de un error opaco.
 */
export function RoleRoute({ allow = [] }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <CheckingSession />;
  if (!isAuthenticated) return <Navigate to="/iniciar-sesion" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/acceso-denegado" replace />;

  return <Outlet />;
}

/**
 * Rutas publicas que no tienen sentido con sesion abierta
 * (iniciar sesion, registro, recuperacion): redirigen al panel.
 */
export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <CheckingSession />;
  if (isAuthenticated) return <Navigate to="/panel" replace />;

  return <Outlet />;
}

export default { ProtectedRoute, RoleRoute, PublicOnlyRoute };
