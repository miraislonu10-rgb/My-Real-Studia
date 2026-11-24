/**
 * STUDIA - Atomo: Avatar
 * ------------------------------------------------------------------
 * Muestra la imagen del perfil o, si no existe, las iniciales del nombre.
 *
 * @param {{name?:string, src?:string, size?:'sm'|'md'|'lg'}} props
 */

const initialsOf = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'S';

export default function Avatar({ name = '', src, size = 'md' }) {
  const sizeClass = size === 'md' ? '' : `avatar--${size}`;

  return (
    <span className={`avatar ${sizeClass}`.trim()} aria-hidden={!name}>
      {src ? <img src={src} alt={name} /> : initialsOf(name)}
    </span>
  );
}
