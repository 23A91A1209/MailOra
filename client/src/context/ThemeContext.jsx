/**
 * ThemeContext.jsx
 * Provides global dark/light theme state with localStorage persistence.
 * The toggle is already wired to the Navbar via useTheme().
 * Adding localStorage so the chosen theme survives page refresh.
 */
import { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

const THEME_KEY = 'mailora-theme'; // localStorage key

export const ThemeProvider = ({ children }) => {
  // Read saved theme on mount; default to 'light' if nothing stored
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(THEME_KEY) || 'light';
  });

  useEffect(() => {
    // Apply theme class to <body> (used by existing CSS overrides throughout the app)
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      document.documentElement.classList.add('dark');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
      document.documentElement.classList.remove('dark');
    }
    // Persist choice so it survives page refresh
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
