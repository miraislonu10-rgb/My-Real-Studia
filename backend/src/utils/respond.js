/**
 * STUDIA - Respuestas HTTP uniformes
 * ------------------------------------------------------------------
 * Toda la API responde con la misma forma:
 *   { success, error, message, data }
 * Este ayudante evita repetir esa estructura en cada controlador nuevo.
 */

/**
 * Envia una respuesta exitosa.
 * @param {import('express').Response} res
 * @param {{message?:string, data?:object, status?:number}} [options]
 */
export const sendSuccess = (res, { message = 'Operacion exitosa.', data = {}, status = 200 } = {}) =>
  res.status(status).json({ success: true, error: null, message, data });

export default { sendSuccess };
