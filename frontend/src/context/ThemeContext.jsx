// src/context/ThemeContext.jsx
import { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const storedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const [theme, setTheme] = useState(storedTheme || (prefersDark ? 'dark' : 'light'));
    const [fontSize, setFontSize] = useState('medium');
    const [highContrast, setHighContrast] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const toggleFontSize = () => {
        const sizes = ['small', 'medium', 'large', 'xl', '2xl'];
        const currentIndex = sizes.indexOf(fontSize);
        const nextIndex = (currentIndex + 1) % sizes.length;
        setFontSize(sizes[nextIndex]);
        document.body.className = `text-${sizes[nextIndex]}`;
    };

    const toggleHighContrast = () => {
        setHighContrast(prev => !prev);
        if (!highContrast) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
    };

    return (
        <ThemeContext.Provider value={{
            theme,
            toggleTheme,
            fontSize,
            toggleFontSize,
            highContrast,
            toggleHighContrast,
            isDark: theme === 'dark',
            isLight: theme === 'light'
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};