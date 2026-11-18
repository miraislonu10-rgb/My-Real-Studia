import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

/**
 * Cliente HTTP centralizado.
 * Todas las peticiones del frontend al backend pasan por esta instancia.
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Adjunta el token JWT si existe (se usara cuando se implemente la autenticacion)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('studia_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normaliza los errores para que la UI siempre reciba un mensaje legible
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED'
        ? 'La peticion tardo demasiado. Verifica que el backend este en ejecucion.'
        : 'No se pudo conectar con la API. Verifica que el backend este en ejecucion.');
    return Promise.reject(new Error(message));
  }
);

/** GET /health -> estado de la API y de la base de datos */
export const getApiHealth = () => api.get('/health').then((response) => response.data);

/** GET /health/db -> tablas creadas en la base de datos */
export const getDatabaseHealth = () => api.get('/health/db').then((response) => response.data);

export { API_URL };
export default api;
