import { useEffect, useState } from 'react';
import { loadPreferences, savePreferences } from '../lib/storage';

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => loadPreferences().theme ?? 'system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const compute = () => {
      const r: 'light' | 'dark' = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      setResolved(r);
      document.documentElement.setAttribute('data-theme', r);
    };
    compute();
    media.addEventListener('change', compute);
    return () => media.removeEventListener('change', compute);
  }, [theme]);

  const set = (t: 'light' | 'dark' | 'system') => {
    setTheme(t);
    savePreferences({ theme: t });
  };

  return { theme, resolved, setTheme: set };
}
