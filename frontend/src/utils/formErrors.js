/**
 * STUDIA - Utilidades para formularios
 */

/**
 * Convierte el detalle de validacion del backend (array de {field, message})
 * en un objeto { campo: mensaje } facil de usar en los formularios.
 *
 * @param {{details?: Array<{field:string, message:string}>}} error
 * @returns {Record<string,string>}
 */
export const mapFieldErrors = (error) => {
  const details = error?.details;
  if (!Array.isArray(details)) return {};

  return details.reduce((accumulator, item) => {
    if (item?.field && !accumulator[item.field]) {
      accumulator[item.field] = item.message;
    }
    return accumulator;
  }, {});
};

/**
 * Validacion basica en el cliente para dar respuesta inmediata.
 * NO sustituye a la validacion del servidor, que es la unica autoritativa.
 */
export const validatePassword = (password, minLength = 8) => {
  if (!password) return 'La contraseña es obligatoria.';
  if (password.length < minLength) return `Debe tener al menos ${minLength} caracteres.`;
  if (!/[a-zA-Z]/.test(password)) return 'Debe incluir al menos una letra.';
  if (!/\d/.test(password)) return 'Debe incluir al menos un numero.';
  return null;
};

export const validateEmail = (email) => {
  if (!email) return 'El correo es obligatorio.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'El correo no tiene un formato valido.';
  return null;
};

export default { mapFieldErrors, validatePassword, validateEmail };
