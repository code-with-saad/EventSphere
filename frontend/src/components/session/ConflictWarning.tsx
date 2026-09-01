import { AlertTriangle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ConflictWarningProps {
  conflictingSession: {
    title: string;
    startTime: string | Date;
    endTime: string | Date;
  };
}

function formatTime(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ConflictWarning({ conflictingSession }: ConflictWarningProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div
      className={`flex items-start gap-sm-token px-md-token py-sm-token rounded-md-token text-sm-token ${
        isDarkMode
          ? 'bg-bg-warning-dark text-text-warning-dark'
          : 'bg-bg-warning-light text-text-warning-light'
      }`}
      role="alert"
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-xs-token" aria-hidden="true" />
      <span>
        <span className="font-medium">Conflicts with: </span>
        {conflictingSession.title}{' '}
        <span className="opacity-80">
          ({formatTime(conflictingSession.startTime)}–{formatTime(conflictingSession.endTime)})
        </span>
      </span>
    </div>
  );
}
