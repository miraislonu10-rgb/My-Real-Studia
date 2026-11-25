import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as authService from '../services/auth.js';
import { setAccessToken, setAuthFailureHandler, refreshAccessToken } from '../services/api.js';

/**
 * STUDIA - Contexto de autenticacion
 * ------------------------------------------------------------------
 * Mantiene el usuario en sesion y expone las acciones de autenticacion.
 *
 * AUTORIZACION EN EL FRONTEND
 * Aqui solo se decide QUE SE MUESTRA (rutas y elementos permitidos segun el
 * rol). No es una medida de seguridad: la autorizacion real la aplica el
 * backend en cada peticion. Ocultar un boton no protege nada por si solo.
 *
 * Al cargar la aplicacion se intenta recuperar la sesion con la cookie
 * httpOnly del token de refresco. Si no hay sesion valida, el usuario queda
 * como invitado sin mostrar ningun error.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'loading' mientras se comprueba la sesion, 'authenticated' o 'guest'
  const [status, setStatus] = useState('loading');

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('guest');
  }, []);

  // Si una peticion no puede renovar la sesion, el contexto vuelve a invitado.
  useEffect(() => {
    setAuthFailureHandler(clearSession);
  }, [clearSession]);

  // Recuperacion de la sesion al arrancar (F5, nueva pestaña, etc.)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { token, user: restored } = await refreshAccessToken();
        if (cancelled) return;

        setAccessToken(token);
        setUser(restored);
        setStatus('authenticated');

        // Se confirma contra /auth/me para tener los datos mas recientes.
        const freshUser = await authService.fetchMe();
        if (!cancelled) setUser(freshUser);
      } catch {
        if (!cancelled) clearSession();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const signIn = useCallback(async (credentials) => {
    const { user: loggedUser, accessToken } = await authService.login(credentials);
    setAccessToken(accessToken);
    setUser(loggedUser);
    setStatus('authenticated');
    return loggedUser;
  }, []);

  const signUp = useCallback(async (payload) => {
    const { user: newUser, accessToken } = await authService.register(payload);
    setAccessToken(accessToken);
    setUser(newUser);
    setStatus('authenticated');
    return newUser;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  // Vuelve a leer la cuenta autenticada (p. ej. tras editar el nombre o el correo).
  const refreshUser = useCallback(async () => {
    const fresh = await authService.fetchMe();
    setUser(fresh);
    return fresh;
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      isAdmin: user?.role === 'admin',
      isStudent: user?.role === 'student',
      isTutor: user?.role === 'tutor',
      isTeacher: user?.role === 'admin' || user?.role === 'tutor',
      fullName: user ? `${user.firstName} ${user.lastName}` : '',
      signIn,
      signUp,
      signOut,
      refreshUser,
      clearSession,
    }),
    [user, status, signIn, signUp, signOut, refreshUser, clearSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook de acceso al contexto de autenticacion. */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return context;
};

export default AuthContext;
