/**
 * STUDIA - Servicio de datos de ejemplo (cliente)
 * ------------------------------------------------------------------
 * Envuelve el endpoint que rellena una cuenta vacia con contenido de
 * demostracion. Devuelve la respuesta completa para poder mostrar su mensaje.
 */

import api from './api.js';

/** POST /demo/seed - carga datos de ejemplo en la cuenta del estudiante. */
export const seedDemoData = () => api.post('/demo/seed').then((r) => r.data);

export default { seedDemoData };
