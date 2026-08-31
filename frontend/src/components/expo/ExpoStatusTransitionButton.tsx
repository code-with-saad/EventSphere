import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { expoService } from '../../services/expoService';
import CascadeConfirmDialog from './CascadeConfirmDialog';

type TransitionAction = 'publish' | 'archive' | 'delete' | 'complete';

interface CascadePreview {
  activeTickets: number;
  pendingApplications: number;
  approvedApplications: number;
  requiresConfirmation: boolean;
}

interface ExpoStatusTransitionButtonProps {
  expoId: string;
  action: TransitionAction;
  onSuccess?: () => void;
  onError?: (message: string) => void;
  className?: string;
  children?: React.ReactNode;
}

type Variant = 'primary' | 'warning' | 'danger';

interface ActionConfig {
  label: string;
  statusTarget?: string;
  needsCascadeCheck: boolean;
  variant: Variant;
}

const ACTION_CONFIG: Record<TransitionAction, ActionConfig> = {
  publish: {
    label: 'Publish',
    statusTarget: 'published',
    needsCascadeCheck: false,
    variant: 'primary',
  },
  complete: {
    label: 'Complete',
    statusTarget: 'completed',
    needsCascadeCheck: false,
    variant: 'warning',
  },
  archive: {
    label: 'Archive',
    statusTarget: 'archived',
    needsCascadeCheck: true,
    variant: 'warning',
  },
  delete: {
    label: 'Delete',
    statusTarget: undefined,
    needsCascadeCheck: true,
    variant: 'danger',
  },
};

export default function ExpoStatusTransitionButton({
  expoId,
  action,
  onSuccess,
  onError,
  className,
  children,
}: ExpoStatusTransitionButtonProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preview, setPreview] = useState<CascadePreview | null>(null);
  const [confirming, setConfirming] = useState(false);

  const config = ACTION_CONFIG[action];

  // ── Variant styles ────────────────────────────────────────────────────────
  const variantStyles: Record<Variant, string> = {
    primary: isDarkMode
      ? 'bg-brand-primary-dark text-text-on-primary-dark hover:opacity-90'
      : 'bg-brand-primary-light text-text-on-primary-light hover:opacity-90',
    warning: isDarkMode
      ? 'bg-bg-warning-dark text-text-warning-dark border border-text-warning-dark hover:opacity-80'
      : 'bg-bg-warning-light text-text-warning-light border border-text-warning-light hover:opacity-80',
    danger: isDarkMode
      ? 'bg-bg-danger-dark text-text-danger-dark border border-text-danger-dark hover:opacity-80'
      : 'bg-bg-danger-light text-text-danger-light border border-text-danger-light hover:opacity-80',
  };

  const btnClass = [
    'px-md-token py-xs-token rounded-md-token text-sm-token font-medium transition-colors disabled:opacity-60',
    variantStyles[config.variant],
    className ?? '',
  ]
    .join(' ')
    .trim();

  // ── Execute the confirmed action ──────────────────────────────────────────
  const execute = async (confirmed: boolean) => {
    setConfirming(true);
    try {
      if (action === 'delete') {
        await expoService.delete(expoId, confirmed);
      } else if (config.statusTarget) {
        await expoService.transitionStatus(
          expoId,
          config.statusTarget,
          confirmed || undefined
        );
      }
      setDialogOpen(false);
      setPreview(null);
      onSuccess?.();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Action failed';
      onError?.(msg);
    } finally {
      setConfirming(false);
    }
  };

  // ── Click handler ─────────────────────────────────────────────────────────
  const handleClick = async () => {
    if (!config.needsCascadeCheck) {
      setLoading(true);
      try {
        await execute(false);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Fetch cascade preview first
    setLoading(true);
    try {
      const cascadeData: CascadePreview = await expoService.getCascadePreview(expoId);
      setPreview(cascadeData);
      if (cascadeData?.requiresConfirmation) {
        setDialogOpen(true);
      } else {
        // Nothing impacted — proceed without confirmation dialog
        await execute(false);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Failed to check cascade impact';
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading || confirming}
        className={btnClass}
        aria-busy={loading || confirming}
      >
        {loading ? 'Checking…' : (children ?? config.label)}
      </button>

      {preview && (
        <CascadeConfirmDialog
          isOpen={dialogOpen}
          action={action === 'delete' ? 'delete' : 'archive'}
          preview={preview}
          onConfirm={() => execute(true)}
          onCancel={() => {
            setDialogOpen(false);
            setPreview(null);
          }}
          isLoading={confirming}
        />
      )}
    </>
  );
}
