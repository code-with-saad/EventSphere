import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface BackButtonProps {
  fallback: string;
  label?: string;
}

export default function BackButton({ fallback, label = 'Back' }: BackButtonProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center gap-xs-token text-sm-token font-medium transition-colors ${
        isDarkMode
          ? 'text-text-secondary-dark hover:text-text-primary-dark'
          : 'text-text-secondary-light hover:text-text-primary-light'
      }`}
    >
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      {label}
    </button>
  );
}
