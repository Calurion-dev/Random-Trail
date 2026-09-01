import { NavLink } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';

export function Header() {
  const { theme, resolved, setTheme } = useTheme();

  const toggle = () => {
    const next = resolved === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <span>⬢</span> Random<span>Parcours</span>
        </div>
        <nav className="nav">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
            Générateur
          </NavLink>
          <NavLink to="/saved" className={({ isActive }) => (isActive ? 'active' : '')}>
            Mes parcours
          </NavLink>
          <NavLink to="/activity" className={({ isActive }) => (isActive ? 'active' : '')}>
            Activité
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
            Réglages
          </NavLink>
        </nav>
      </div>
      <div className="header-right">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as any)}
          className="select"
          style={{ width: 130 }}
          title="Thème"
        >
          <option value="system">Système</option>
          <option value="light">Clair</option>
          <option value="dark">Sombre</option>
        </select>
        <button className="icon-btn" onClick={toggle} title={resolved === 'dark' ? 'Passer en clair' : 'Passer en sombre'}>
          {resolved === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
