import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export default function ThemeSwitcher() {
    const [theme, setTheme] = useState<Theme>('system');

    // Apply theme to document element
    useEffect(() => {
        const root = document.documentElement;
        const apply = (t: Theme) => {
            if (t === 'system') {
                root.classList.remove('light', 'dark');
                // system follows prefers-color-scheme media query, no class needed
            } else if (t === 'light') {
                root.classList.add('light');
                root.classList.remove('dark');
            } else {
                root.classList.add('dark');
                root.classList.remove('light');
            }
        };
        apply(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Load saved preference on mount
    useEffect(() => {
        const saved = (localStorage.getItem('theme') as Theme) || 'system';
        setTheme(saved);
    }, []);

    return (
        <div className="flex items-center gap-2 text-sm">
            <label htmlFor="theme-select" className="font-medium">Theme</label>
            <select
                id="theme-select"
                value={theme}
                onChange={e => setTheme(e.target.value as Theme)}
                className="rounded border border-gray-300 bg-white dark:bg-gray-800 p-1"
            >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>
        </div>
    );
}
