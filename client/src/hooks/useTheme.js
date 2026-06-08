import { useState, useEffect } from 'react';

export function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('timebox-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('timebox-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return [dark, setDark];
}
