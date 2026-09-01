import { useState, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ticketService } from '../../services/ticketService';

interface PDFDownloadButtonProps {
  ticketId: string;
}

export default function PDFDownloadButton({ ticketId }: PDFDownloadButtonProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      const blob: Blob = await ticketService.downloadPDF(ticketId);
      const objectUrl = URL.createObjectURL(blob);

      if (linkRef.current) {
        linkRef.current.href = objectUrl;
        linkRef.current.download = `ticket-${ticketId}.pdf`;
        linkRef.current.click();
      }

      // Revoke after a short delay to ensure the download has started
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            ?? 'Failed to download PDF';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-xs-token">
      <button
        onClick={handleDownload}
        disabled={loading}
        className={`px-md-token py-xs-token rounded-md-token text-sm-token font-semibold transition-colors disabled:opacity-60 ${
          isDarkMode
            ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-accent-hover-dark'
            : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light'
        }`}
      >
        {loading ? 'Generating PDF…' : 'Download PDF Ticket'}
      </button>

      {error && (
        <p className={`text-xs-token ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`}>
          {error}
        </p>
      )}

      {/* Hidden anchor for programmatic download */}
      {/* eslint-disable-next-line jsx-a11y/anchor-has-content */}
      <a ref={linkRef} className="sr-only" aria-hidden="true" />
    </div>
  );
}
