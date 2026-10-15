import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function ThemeToggle({ className = '', ...props }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      aria-label={isDark ? 'Kun rejimiga o‘tish (Light mode)' : 'Tun rejimiga o‘tish (Dark mode)'}
      title={isDark ? 'Kun rejimiga o‘tish' : 'Tun rejimiga o‘tish'}
      onClick={toggleTheme}
      className={['mf-global-theme-toggle', isDark ? 'is-dark' : 'is-light', className].filter(Boolean).join(' ')}
      {...props}
    >
      <span className="mf-theme-toggle__icon" aria-hidden="true">
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </span>
    </button>
  );
}
