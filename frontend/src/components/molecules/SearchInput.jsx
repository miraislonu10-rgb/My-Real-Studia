/**
 * STUDIA - Molecula: Campo de busqueda
 * @param {{value:string, onChange:Function, placeholder?:string, label?:string}} props
 */

import Icon from '../atoms/Icon.jsx';

export default function SearchInput({ value, onChange, placeholder = 'Buscar...', label }) {
  return (
    <div className="search">
      <Icon name="search" size={16} />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label || placeholder}
      />
    </div>
  );
}
