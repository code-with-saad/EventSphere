import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ExhibitorFilterBarProps {
  onSearch: (query: string) => void;
  onCategoryChange: (category: string) => void;
  categories: string[];
  selectedCategory: string;
}

export default function ExhibitorFilterBar({
  onSearch,
  onCategoryChange,
  categories,
  selectedCategory,
}: ExhibitorFilterBarProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [inputValue, setInputValue] = useState('');

  // Debounce search 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, onSearch]);

  const inputClasses = `w-full rounded-md-token border px-sm-token py-xs-token text-sm-token outline-none transition-colors ${
    isDarkMode
      ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark placeholder:text-text-secondary-dark focus:border-brand-primary-dark'
      : 'bg-bg-surface-light border-border-base-light text-text-primary-light placeholder:text-text-secondary-light focus:border-brand-primary-light'
  }`;

  const chipBase = `px-sm-token py-xs-token rounded-sm-token text-xs-token font-medium cursor-pointer transition-colors`;
  const chipActive = isDarkMode
    ? 'bg-brand-primary-dark text-text-on-primary-dark'
    : 'bg-brand-primary-light text-text-on-primary-light';
  const chipInactive = isDarkMode
    ? 'bg-bg-surface-dark text-text-secondary-dark border border-border-base-dark hover:bg-bg-hover-dark'
    : 'bg-bg-surface-light text-text-secondary-light border border-border-base-light hover:bg-bg-hover-light';

  return (
    <div className="flex flex-col gap-sm-token sm:flex-row sm:items-center">
      <input
        type="text"
        placeholder="Search exhibitors…"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className={inputClasses}
        aria-label="Search exhibitors"
      />
      <div className="flex flex-wrap gap-xs-token">
        <button
          onClick={() => onCategoryChange('')}
          className={`${chipBase} ${selectedCategory === '' ? chipActive : chipInactive}`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`${chipBase} ${selectedCategory === cat ? chipActive : chipInactive}`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
