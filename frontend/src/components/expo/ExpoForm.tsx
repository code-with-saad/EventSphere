import { useState, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { uploadService } from '../../services/uploadService';

interface ExpoFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  venueName: string;
  venueAddress: string;
  totalBooths: number | '';
  bannerUrl?: string;
  websiteUrl?: string;
  category?: string;
  tags?: string;
  venueMapUrl?: string;
}

interface ExpoFormErrors {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  venueName?: string;
  venueAddress?: string;
  totalBooths?: string;
  banner?: string;
}

interface ExpoFormProps {
  initialData?: Partial<ExpoFormData>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
}

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BANNER_BYTES = 5 * 1024 * 1024; // 5 MB

const CATEGORIES = [
  'Technology',
  'Health & Wellness',
  'Art & Culture',
  'Business',
  'Education',
  'Food & Beverage',
  'Fashion',
  'Sports',
  'Entertainment',
  'Other',
];

export default function ExpoForm({
  initialData = {},
  onSubmit,
  submitLabel = 'Save',
  isLoading = false,
}: ExpoFormProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ExpoFormData>({
    name: initialData.name ?? '',
    description: initialData.description ?? '',
    startDate: initialData.startDate ?? '',
    endDate: initialData.endDate ?? '',
    venueName: initialData.venueName ?? '',
    venueAddress: initialData.venueAddress ?? '',
    totalBooths: initialData.totalBooths ?? '',
    bannerUrl: initialData.bannerUrl ?? '',
    websiteUrl: initialData.websiteUrl ?? '',
    category: initialData.category ?? '',
    tags: initialData.tags ?? '',
    venueMapUrl: initialData.venueMapUrl ?? '',
  });

  const [errors, setErrors] = useState<ExpoFormErrors>({});
  const [bannerPreview, setBannerPreview] = useState<string>(
    initialData.bannerUrl ?? ''
  );
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Shared style helpers ──────────────────────────────────────────────────

  const labelClass = `block text-sm-token font-medium mb-xs-token ${
    isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
  }`;

  const inputClass = (hasError?: string) =>
    `w-full rounded-md-token border px-sm-token py-xs-token text-sm-token outline-none transition-colors ${
      hasError
        ? isDarkMode
          ? 'border-text-danger-dark'
          : 'border-text-danger-light'
        : isDarkMode
        ? 'border-border-base-dark focus:border-brand-primary-dark'
        : 'border-border-base-light focus:border-brand-primary-light'
    } ${
      isDarkMode
        ? 'bg-bg-surface-dark text-text-primary-dark placeholder:text-text-secondary-dark'
        : 'bg-bg-surface-light text-text-primary-light placeholder:text-text-secondary-light'
    }`;

  const errorClass = `mt-xs-token text-xs-token ${
    isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
  }`;

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): ExpoFormErrors => {
    const e: ExpoFormErrors = {};

    if (!form.name.trim()) {
      e.name = 'Name is required';
    } else if (form.name.length > 120) {
      e.name = 'Name must be 120 characters or fewer';
    }

    if (!form.description.trim()) {
      e.description = 'Description is required';
    } else if (form.description.length > 2000) {
      e.description = 'Description must be 2000 characters or fewer';
    }

    if (!form.startDate) {
      e.startDate = 'Start date is required';
    } else if (new Date(form.startDate) <= new Date()) {
      e.startDate = 'Start date must be in the future';
    }

    if (!form.endDate) {
      e.endDate = 'End date is required';
    } else if (form.startDate && new Date(form.endDate) <= new Date(form.startDate)) {
      e.endDate = 'End date must be after start date';
    }

    if (!form.venueName.trim()) e.venueName = 'Venue name is required';
    if (!form.venueAddress.trim()) e.venueAddress = 'Venue address is required';

    if (form.totalBooths === '' || Number(form.totalBooths) < 1) {
      e.totalBooths = 'Total booths must be at least 1';
    }

    return e;
  };

  // ── Banner upload ─────────────────────────────────────────────────────────

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        banner: 'Only PNG, JPG, or WebP images are allowed',
      }));
      return;
    }
    if (file.size > MAX_BANNER_BYTES) {
      setErrors((prev) => ({
        ...prev,
        banner: 'Banner image must be 5 MB or smaller',
      }));
      return;
    }

    setErrors((prev) => ({ ...prev, banner: undefined }));
    setBannerPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const { url } = await uploadService.uploadImage(file, 'expo_banner');
      setForm((prev) => ({ ...prev, bannerUrl: url }));
      setBannerPreview(url);
    } catch {
      setErrors((prev) => ({
        ...prev,
        banner: 'Upload failed. Please try again.',
      }));
      setBannerPreview('');
    } finally {
      setUploading(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim(),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        venueName: form.venueName.trim(),
        venueAddress: form.venueAddress.trim(),
        totalBooths: Number(form.totalBooths),
      };

      if (form.bannerUrl) payload.bannerUrl = form.bannerUrl;
      if (form.websiteUrl?.trim()) payload.websiteUrl = form.websiteUrl.trim();
      if (form.category) payload.category = form.category;
      if (form.tags?.trim())
        payload.tags = form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      if (form.venueMapUrl?.trim()) payload.venueMapUrl = form.venueMapUrl.trim();

      await onSubmit(payload);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.';
      setSubmitError(message);
    }
  };

  // ── Field helper (text / url / datetime-local) ───────────────────────────

  type SimpleFieldKey = Exclude<keyof ExpoFormData, 'totalBooths' | 'description'>;

  const field = (
    id: SimpleFieldKey,
    label: string,
    type = 'text',
    placeholder = '',
    required = false
  ) => (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required && (
          <span aria-hidden="true" className="ml-xs-token text-text-danger-dark">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={(form[id] as string) ?? ''}
        onChange={(e) => setForm((p) => ({ ...p, [id]: e.target.value }))}
        placeholder={placeholder}
        className={inputClass(errors[id as keyof ExpoFormErrors])}
        aria-describedby={
          errors[id as keyof ExpoFormErrors] ? `${id}-error` : undefined
        }
      />
      {errors[id as keyof ExpoFormErrors] && (
        <p id={`${id}-error`} role="alert" className={errorClass}>
          {errors[id as keyof ExpoFormErrors]}
        </p>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const sectionHeadClass = `text-sm-token font-semibold uppercase tracking-wide ${
    isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
  }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-md-token">

      {/* ── Group 1: Basic Information ──────────────────────────────────────── */}
      <div className="flex flex-col gap-md-token">
        <h3 className={sectionHeadClass}>Basic Information</h3>

        {/* Expo Name */}
        {field('name', 'Expo Name', 'text', 'e.g. TechFest 2025', true)}

        {/* Description */}
        <div>
          <label htmlFor="description" className={labelClass}>
            Description{' '}
            <span aria-hidden="true" className="ml-xs-token text-text-danger-dark">
              *
            </span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Describe your expo…"
            className={`${inputClass(errors.description)} resize-y`}
            aria-describedby={errors.description ? 'description-error' : undefined}
          />
          {errors.description && (
            <p id="description-error" role="alert" className={errorClass}>
              {errors.description}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className={labelClass}>
            Category
          </label>
          <select
            id="category"
            name="category"
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            className={inputClass()}
          >
            <option value="">Select a category…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Banner upload */}
        <div>
          <label htmlFor="banner-upload" className={labelClass}>
            Banner Image (PNG/JPG/WebP, max 5 MB)
          </label>
          <div className="flex flex-col gap-sm-token">
            {bannerPreview && (
              <img
                src={bannerPreview}
                alt="Banner preview"
                className="w-full h-40 object-cover rounded-md-token"
              />
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={`px-sm-token py-xs-token rounded-md-token text-sm-token font-medium border transition-colors disabled:opacity-60 ${
                isDarkMode
                  ? 'border-border-base-dark text-text-primary-dark hover:bg-bg-hover-dark'
                  : 'border-border-base-light text-text-primary-light hover:bg-bg-hover-light'
              }`}
            >
              {uploading ? 'Uploading…' : bannerPreview ? 'Change Banner' : 'Upload Banner'}
            </button>
            <input
              ref={fileInputRef}
              id="banner-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleBannerChange}
              className="sr-only"
              aria-label="Upload banner image"
            />
            {errors.banner && (
              <p role="alert" className={errorClass}>
                {errors.banner}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Group 2: Schedule & Venue ───────────────────────────────────────── */}
      <div className={`flex flex-col gap-md-token pt-lg-token border-t ${isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'}`}>
        <h3 className={sectionHeadClass}>Schedule &amp; Venue</h3>

        {/* Date range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md-token">
          {field('startDate', 'Start Date', 'datetime-local', '', true)}
          {field('endDate', 'End Date', 'datetime-local', '', true)}
        </div>

        {/* Venue */}
        {field('venueName', 'Venue Name', 'text', 'e.g. Convention Centre', true)}
        {field('venueAddress', 'Venue Address', 'text', 'e.g. 123 Main St, City', true)}

        {/* Total Booths */}
        <div>
          <label htmlFor="totalBooths" className={labelClass}>
            Total Booths{' '}
            <span aria-hidden="true" className="ml-xs-token text-text-danger-dark">
              *
            </span>
          </label>
          <input
            id="totalBooths"
            name="totalBooths"
            type="number"
            min={1}
            value={form.totalBooths}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                totalBooths:
                  e.target.value === '' ? '' : Number(e.target.value),
              }))
            }
            className={inputClass(errors.totalBooths)}
            aria-describedby={errors.totalBooths ? 'totalBooths-error' : undefined}
          />
          {errors.totalBooths && (
            <p id="totalBooths-error" role="alert" className={errorClass}>
              {errors.totalBooths}
            </p>
          )}
        </div>
      </div>

      {/* ── Group 3: Optional Details ───────────────────────────────────────── */}
      <div className={`flex flex-col gap-md-token pt-lg-token border-t ${isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'}`}>
        <h3 className={sectionHeadClass}>Optional Details</h3>

        {field('websiteUrl', 'Website URL', 'url', 'https://…')}
        {field('tags', 'Tags (comma-separated)', 'text', 'e.g. tech, innovation, AI')}
        {field('venueMapUrl', 'Venue Map URL', 'url', 'https://maps.google.com/…')}
      </div>

      {/* Submit error */}
      {submitError && (
        <p
          role="alert"
          className={`text-sm-token ${
            isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
          }`}
        >
          {submitError}
        </p>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading || uploading}
        className={`w-full py-sm-token px-md-token rounded-md-token text-sm-token font-semibold transition-colors disabled:opacity-60 mt-md-token ${
          isDarkMode
            ? 'bg-brand-primary-dark text-text-on-primary-dark hover:opacity-90'
            : 'bg-brand-primary-light text-text-on-primary-light hover:opacity-90'
        }`}
      >
        {isLoading ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
