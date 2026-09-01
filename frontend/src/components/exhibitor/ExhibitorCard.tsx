import { useTheme } from '../../contexts/ThemeContext';

interface ExhibitorCardProps {
  exhibitor: {
    _id: string;
    companyName: string;
    companyDescription: string;
    category: string;
    logoUrl?: string;
    boothLabel?: string;
  };
  onClick?: () => void;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + '…';
}

export default function ExhibitorCard({ exhibitor, onClick }: ExhibitorCardProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg-token border p-md-token transition-colors backdrop-blur-sm ${
        isDarkMode
          ? 'bg-glass-dark border-glass-border-dark hover:bg-bg-hover-dark'
          : 'bg-glass-light border-glass-border-light hover:bg-bg-hover-light'
      }`}
    >
      <div className="flex items-center gap-sm-token mb-xs-token">
        {exhibitor.logoUrl ? (
          <img
            src={exhibitor.logoUrl}
            alt={`${exhibitor.companyName} logo`}
            className="w-10 h-10 rounded-md-token object-contain flex-shrink-0"
          />
        ) : (
          <div
            className={`w-10 h-10 rounded-md-token flex items-center justify-center text-sm-token font-semibold flex-shrink-0 ${
              isDarkMode
                ? 'bg-bg-hover-dark text-text-secondary-dark'
                : 'bg-bg-hover-light text-text-secondary-light'
            }`}
          >
            {exhibitor.companyName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div
            className={`text-sm-token font-semibold truncate ${
              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
            }`}
          >
            {exhibitor.companyName}
          </div>
          <div
            className={`text-xs-token ${
              isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
            }`}
          >
            {exhibitor.category}
          </div>
        </div>
      </div>
      <p
        className={`text-xs-token leading-normal-token ${
          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
        }`}
      >
        {truncate(exhibitor.companyDescription, 120)}
      </p>
      {exhibitor.boothLabel && (
        <div
          className={`mt-xs-token text-xs-token font-medium ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}
        >
          Booth: {exhibitor.boothLabel}
        </div>
      )}
    </button>
  );
}
