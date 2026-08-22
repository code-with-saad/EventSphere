import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Theme type definition
type Theme = 'dark' | 'light';

// ThemeContext interface
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// Create the context with undefined default (will be provided by ThemeProvider)
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ThemeProvider props
interface ThemeProviderProps {
  children: ReactNode;
}

// ThemeProvider component
export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize theme from localStorage or system preference
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }
    
    // Fall back to system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  // Apply theme to document root and persist to localStorage
  useEffect(() => {
    // Remove both theme classes first
    document.documentElement.classList.remove('dark', 'light');
    
    // Add the current theme class
    document.documentElement.classList.add(theme);
    
    // Persist to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toggle theme function
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use the ThemeContext
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}
