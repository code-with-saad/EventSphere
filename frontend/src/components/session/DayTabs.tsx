import { useTheme } from '../../contexts/ThemeContext';

interface DayTabsProps {
  days: Date[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function formatDayTab(date: Date): { day: string; date: string } {
  return {
    day: date.toLocaleDateString('en-US', { weekday: 'short' }),
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}

export default function DayTabs({ days, selectedIndex, onSelect }: DayTabsProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  if (!days.length) return null;

  return (
    <div
      className="flex gap-xs-token overflow-x-auto pb-xs-token"
      role="tablist"
      aria-label="Schedule days"
    >
      {days.map((day, i) => {
        const { day: dayLabel, date: dateLabel } = formatDayTab(day);
        const isActive = i === selectedIndex;
        return (
          <button
            key={i}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(i)}
            className={`flex-shrink-0 flex flex-col items-center px-md-token py-sm-token rounded-md-token text-center transition-colors ${
              isActive
                ? isDarkMode
                  ? 'bg-brand-primary-dark text-text-on-primary-dark'
                  : 'bg-brand-primary-light text-text-on-primary-light'
                : isDarkMode
                  ? 'bg-bg-surface-dark text-text-secondary-dark border border-border-base-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
                  : 'bg-bg-surface-light text-text-secondary-light border border-border-base-light hover:bg-bg-hover-light hover:text-text-primary-light'
            }`}
          >
            <span className="text-xs-token font-medium">{dayLabel}</span>
            <span className="text-sm-token font-semibold">{dateLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
