/**
 * STUDIA - Atomo: Boton
 * ------------------------------------------------------------------
 * Boton o enlace con variantes visuales y estado de carga.
 *
 * @param {{
 *   children: React.ReactNode,
 *   variant?: 'primary'|'secondary'|'ghost'|'danger',
 *   size?: 'md'|'sm',
 *   icon?: string,
 *   block?: boolean,
 *   loading?: boolean,
 *   as?: 'button'|'a',
 *   href?: string,
 * }} props
 */

import Icon from './Icon.jsx';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconAfter,
  block = false,
  loading = false,
  type = 'button',
  className = '',
  as = 'button',
  ...rest
}) {
  const classes = [
    'button',
    variant !== 'primary' ? `button--${variant}` : '',
    size === 'sm' ? 'button--small' : '',
    block ? 'button--block' : '',
    icon && !children ? 'button--icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {loading ? <span className="button__spinner" aria-hidden="true" /> : icon && <Icon name={icon} />}
      {children}
      {!loading && iconAfter && <Icon name={iconAfter} />}
    </>
  );

  if (as === 'a') {
    return (
      <a className={classes} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button className={classes} type={type} disabled={loading || rest.disabled} {...rest}>
      {content}
    </button>
  );
}
