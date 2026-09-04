import { useRef } from 'react';
import { Download } from 'lucide-react';
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
    <div className="flex flex-col items-center gap-md-token">
      {/* QR image container — elevated white card with subtle glow */}
      <div className="p-3 bg-white rounded-xl-token shadow-elevation-2-dark border border-white/20">
        <img
          src={qrCodeDataUrl}
          alt={`QR code for ticket ${ticketId}`}
          className="w-48 h-48 md:w-52 md:h-52 object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      <p className={`text-xs-token text-center ${
        isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
      }`}>
        Scan this QR code at the event entrance for quick check-in.
      </p>

      {/* Download PNG button */}
      <button
        type="button"
        onClick={handleDownload}
        className={`w-full flex items-center justify-center gap-1.5 px-md-token py-xs-token rounded-md-token text-sm-token font-medium border transition-colors ${
          isDarkMode
            ? 'border-border-base-dark text-text-primary-dark hover:bg-bg-hover-dark'
            : 'border-border-base-light text-text-primary-light hover:bg-bg-hover-light'
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        Download QR Image
      </button>

      {/* Hidden anchor for programmatic download */}
      {/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
      <a ref={linkRef} className="sr-only" aria-hidden="true" />
    </div>
  );
}
