/**
 * STUDIA - Organismo: Menu del usuario
 * ------------------------------------------------------------------
 * Muestra el perfil en sesion y permite cerrar la sesion. Se cierra al pulsar
 * fuera o con la tecla Escape.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Avatar from '../atoms/Avatar.jsx';
import Icon from '../atoms/Icon.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const ROLE_LABELS = { admin: 'Administrador', tutor: 'Tutor', student: 'Estudiante' };

export default function UserMenu() {
  const { fullName, user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;

    const onClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate('/iniciar-sesion', { replace: true });
  };

  return (
    <div className="usermenu" ref={containerRef}>
      <button
        type="button"
        className="usermenu__trigger"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar name={fullName || user?.email} src={user?.avatarUrl} />
        <span className="usermenu__meta">
          <span className="usermenu__name">{fullName || 'Usuario'}</span>
          <span className="usermenu__role">{ROLE_LABELS[user?.role] || 'Usuario'}</span>
        </span>
        <Icon name="chevronRight" size={16} />
      </button>

      {open && (
        <div className="usermenu__panel" role="menu">
          <div className="usermenu__head">
            <Avatar name={fullName || user?.email} src={user?.avatarUrl} size="lg" />
            <div className="usermenu__head-info">
              <strong>{fullName || 'Usuario'}</strong>
              <span>{user?.email}</span>
              {isAdmin && <span>Acceso completo de administracion</span>}
            </div>
          </div>

          <Link to="/perfil" className="usermenu__item" onClick={() => setOpen(false)} role="menuitem">
            <Icon name="user" size={16} />
            Mi perfil
          </Link>

          <button type="button" className="usermenu__item usermenu__item--danger" onClick={handleSignOut} role="menuitem">
            <Icon name="logout" size={16} />
            Cerrar sesion
          </button>
        </div>
      )}
    </div>
  );
}
