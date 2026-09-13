'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'dark' | 'light' | 'light-blue' | 'light-green';

type ThemeContextType = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    // Try to get from localStorage first value from URL params, then localStorage, then default to light
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const themeFromUrl = urlParams.get('theme') as ThemeMode | null;
      if (themeFromUrl && ['dark', 'light', 'light-blue', 'light-green'].includes(themeFromUrl)) {
        return themeFromUrl;
      }
      
      const savedTheme = localStorage.getItem('theme') as ThemeMode | null;
      if (savedTheme && ['dark', 'light', 'light-blue', 'light-green'].includes(savedTheme)) {
        return savedTheme;
      }
    }
    return 'light';
  });

  // Apply theme to html element
  useEffect(() => {
    // Remove all theme classes
    document.documentElement.classList.remove('dark', 'light', 'light-blue', 'light-green');
    
    // Add the current theme class
    document.documentElement.classList.add(theme);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const handleSetTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
  };

  const toggleTheme = () => {
    const themes: ThemeMode[] = ['dark', 'light', 'light-blue', 'light-green'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex] as ThemeMode;
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}