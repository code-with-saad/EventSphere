import { useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface QRTicketDisplayProps {
  ticketId: string;
  qrCodeDataUrl: string;
}

export default function QRTicketDisplay({ ticketId, qrCodeDataUrl }: QRTicketDisplayProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const linkRef = useRef<HTMLAnchorElement>(null);

  const handleDownload = () => {
    if (!linkRef.current) return;
    linkRef.current.href = qrCodeDataUrl;
    linkRef.current.download = `ticket-${ticketId}.png`;
    linkRef.current.click();
  };

  return (
    <div className={`rounded-lg-token border p-md-token flex flex-col items-center gap-md-token ${
      isDarkMode ? 'bg-bg-surface-dark border-border-base-dark' : 'bg-bg-surface-light border-border-base-light'
    }`}>
      {/* QR image — always white bg, black QR regardless of theme (REQ-5.11) */}
      <div className="bg-white p-sm-token rounded-md-token">
        <img
          src={qrCodeDataUrl}
          alt={`QR code for ticket ${ticketId}`}
          className="w-48 h-48 object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Ticket ID */}
      <p className={`text-xs-token font-mono text-center break-all ${
        isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
      }`}>
        {ticketId}
      </p>

      {/* Download PNG button */}
      <button
        onClick={handleDownload}
        className={`px-md-token py-xs-token rounded-md-token text-sm-token font-medium border transition-colors ${
          isDarkMode
            ? 'border-border-base-dark text-text-primary-dark hover:bg-bg-hover-dark'
            : 'border-border-base-light text-text-primary-light hover:bg-bg-hover-light'
        }`}
      >
        Download PNG
      </button>

      {/* Hidden anchor for programmatic download */}
      {/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
      <a ref={linkRef} className="sr-only" aria-hidden="true" />
    </div>
  );
}
