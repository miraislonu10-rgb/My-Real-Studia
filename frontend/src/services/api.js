import axios from 'axios';

/**
 * URL base de la API. Se resuelve en este orden:
 *  1. La etiqueta <meta name="studia-api-url"> de index.html. Permite apuntar
 *     al backend publicado editando ese archivo en el servidor, sin recompilar.
 *  2. VITE_API_URL, definida en .env: es la que se usa en desarrollo local.
 *  3. El backend local por defecto.
 */
const metaApiUrl =
  typeof document !== 'undefined'
    ? document.querySelector('meta[name="studia-api-url"]')?.content?.trim()
    : '';

const API_URL = metaApiUrl || import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

/**
 * Error de API normalizado.
 * Conserva el codigo HTTP y el detalle por campo para que los formularios
 * puedan mostrar los mensajes de validacion que devuelve el backend.
 */
export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const toApiError = (error) => {
  const response = error.response;

  if (!response) {
    const offline =
      error.code === 'ECONNABORTED'
        ? `La peticion tardo demasiado. Verifica que el backend este en ejecucion en ${API_URL}.`
        : `No se pudo conectar con la API. Verifica que el backend este en ejecucion en ${API_URL}.`;
    return new ApiError(offline, { code: 'NETWORK_ERROR' });
  }

  return new ApiError(response.data?.message || 'Ocurrio un error inesperado.', {
    status: response.status,
    code: response.data?.error,
    details: response.data?.details,
  });
};

/**
 * El token de acceso vive SOLO en memoria (no en localStorage ni cookies
 * legibles por JavaScript). Asi un XSS no puede robarlo desde el
 * almacenamiento. Al recargar la pagina se recupera mediante el token de
 * refresco, que viaja en una cookie httpOnly inaccesible para el JavaScript.
 */
let accessToken = null;
let onAuthFailure = null;

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getAccessToken = () => accessToken;

/** El AuthContext registra aqui que hacer cuando la sesion caduca de verdad. */
export const setAuthFailureHandler = (handler) => {
  onAuthFailure = handler;
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: true, // envia y recibe la cookie httpOnly del token de refresco
  headers: { 'Content-Type': 'application/json' },
});

// Adjunta el token de acceso a cada peticion
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

/**
 * Instancia "limpia" para renovar la sesion. No pasa por los interceptores,
 * por lo que un 401 al refrescar no dispara un bucle infinito.
 */
const refreshClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let refreshInFlight = null;

/** Renueva el token de acceso usando la cookie httpOnly. */
export const refreshAccessToken = () => {
  if (!refreshInFlight) {
    refreshInFlight = refreshClient
      .post('/auth/refresh')
      .then((response) => {
        const { accessToken: token, user } = response.data.data;
        setAccessToken(token);
        return { token, user };
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

/**
 * Si una peticion falla con 401 (token de acceso caducado), intenta renovar la
 * sesion UNA sola vez y repite la peticion original. Varias peticiones
 * simultaneas comparten la misma renovacion (refreshInFlight).
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    const isAuthEndpoint = config?.url?.includes('/auth/');

    if (response?.status === 401 && config && !config._retried && !isAuthEndpoint) {
      config._retried = true;
      try {
        const { token } = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      } catch {
        setAccessToken(null);
        if (onAuthFailure) onAuthFailure();
        return Promise.reject(toApiError(error));
      }
    }

    return Promise.reject(toApiError(error));
  }
);

/** Estado general de la API y de la conexion a MySQL. */
export const getApiHealth = () => api.get('/health');

/** Detalle del esquema de la base de datos (tablas creadas). */
export const getDatabaseHealth = () => api.get('/health/db');

export { API_URL };
export default api;
