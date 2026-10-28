import { useState } from 'react';

export function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  try { localStorage.setItem('pp_theme', dark ? 'dark' : 'light'); } catch { /* storage unavailable */ }
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  return (
    <button type="button" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title={dark ? 'Light theme' : 'Dark theme'}
      onClick={() => { applyTheme(!dark); setDark(!dark); }}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-surface text-slate-600 transition hover:bg-slate-100 ${className}`}>
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      )}
    </button>
  );
}
