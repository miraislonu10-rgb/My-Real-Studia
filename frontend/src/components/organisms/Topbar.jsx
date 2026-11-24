/**
 * STUDIA - Organismo: Encabezado
 * ------------------------------------------------------------------
 * Barra superior con el titulo de la pantalla, el disparador del menu en
 * pantallas pequenas y el menu del usuario.
 *
 * @param {{title?:string, subtitle?:string, onMenuClick:Function, actions?:React.ReactNode}} props
 */

import Icon from '../atoms/Icon.jsx';
import UserMenu from './UserMenu.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Topbar({ title, subtitle, onMenuClick, actions }) {
  const { fullName } = useAuth();

  return (
    <header className="topbar">
      <button type="button" className="topbar__menu" onClick={onMenuClick} aria-label="Abrir navegacion">
        <Icon name="menu" size={20} />
      </button>

      <div>
        <h2 className="topbar__title">{title}</h2>
        <p className="topbar__subtitle">{subtitle || `Hola, ${fullName || 'bienvenido'}`}</p>
      </div>

      <div className="topbar__spacer" />

      <div className="topbar__actions">
        {actions}
        <UserMenu />
      </div>
    </header>
  );
}
