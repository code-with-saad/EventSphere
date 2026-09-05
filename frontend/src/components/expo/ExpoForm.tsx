import { useState, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { uploadService } from '../../services/uploadService';
import { BentoCard } from '../common/BentoCard';
import { FileText, Image, Calendar, Sparkles, Layers, Plus, Trash2 } from 'lucide-react';

export interface FormZone {
  name: string;
  boothCount: number | '';
}

interface ExpoFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  venueName: string;
  venueAddress: string;
  totalBooths: number | '';
  zones: FormZone[];
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
  zones?: string;
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

  const initialZones: FormZone[] = initialData.zones && initialData.zones.length > 0
    ? initialData.zones.map(z => ({ name: z.name, boothCount: z.boothCount }))
    : [{ name: 'Main Hall', boothCount: initialData.totalBooths || 20 }];

  const [form, setForm] = useState<ExpoFormData>({
    name: initialData.name ?? '',
    description: initialData.description ?? '',
    startDate: initialData.startDate ?? '',
    endDate: initialData.endDate ?? '',
    venueName: initialData.venueName ?? '',
    venueAddress: initialData.venueAddress ?? '',
    totalBooths: initialData.totalBooths ?? 20,
    zones: initialZones,
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

  // Total booths computed live from zones
  const computedTotalBooths = form.zones.reduce(
    (sum, z) => sum + (typeof z.boothCount === 'number' ? z.boothCount : Number(z.boothCount) || 0),
    0
  );

  const handleAddZone = () => {
    const nextChar = String.fromCharCode(65 + form.zones.length); // A, B, C...
    setForm((p) => ({
      ...p,
      zones: [...p.zones, { name: `Hall ${nextChar}`, boothCount: 10 }],
    }));
  };

  const handleRemoveZone = (index: number) => {
    if (form.zones.length <= 1) return;
    setForm((p) => ({
      ...p,
      zones: p.zones.filter((_, i) => i !== index),
    }));
  };

  const handleZoneChange = (index: number, field: keyof FormZone, value: string | number) => {
    setForm((p) => {
      const nextZones = [...p.zones];
      nextZones[index] = {
        ...nextZones[index],
        [field]: field === 'boothCount' ? (value === '' ? '' : Number(value)) : value,
      };
      return { ...p, zones: nextZones };
    });
  };

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

  const validate = (): ExpoFormErrors => {
    const errs: ExpoFormErrors = {};

    if (!form.name.trim()) {
      errs.name = 'Expo name is required.';
    } else if (form.name.trim().length > 120) {
      errs.name = 'Expo name must not exceed 120 characters.';
    }

    if (!form.description.trim()) {
      errs.description = 'Description is required.';
    } else if (form.description.trim().length > 2000) {
      errs.description = 'Description must not exceed 2000 characters.';
    }

    if (!form.startDate) {
      errs.startDate = 'Start date is required.';
    }

    if (!form.endDate) {
      errs.endDate = 'End date is required.';
    } else if (
      form.startDate &&
      new Date(form.endDate) <= new Date(form.startDate)
    ) {
      errs.endDate = 'End date must be strictly after start date.';
    }

    if (!form.venueName.trim()) {
      errs.venueName = 'Venue name is required.';
    } else if (form.venueName.trim().length > 100) {
      errs.venueName = 'Venue name must not exceed 100 characters.';
    }

    if (!form.venueAddress.trim()) {
      errs.venueAddress = 'Venue address is required.';
    } else if (form.venueAddress.trim().length > 200) {
      errs.venueAddress = 'Venue address must not exceed 200 characters.';
    }

    if (!form.zones || form.zones.length === 0) {
      errs.zones = 'At least one zone is required.';
    } else {
      for (const z of form.zones) {
        if (!z.name.trim()) {
          errs.zones = 'All zones must have a name.';
          break;
        }
        if (z.boothCount === '' || Number(z.boothCount) < 1) {
          errs.zones = 'Each zone must have at least 1 booth.';
          break;
        }
      }
    }

    return errs;
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      setErrors((p) => ({
        ...p,
        banner: 'Only PNG, JPG, and WebP images are allowed.',
      }));
      return;
    }

    if (file.size > MAX_BANNER_BYTES) {
      setErrors((p) => ({
        ...p,
        banner: 'Banner image must not exceed 5 MB.',
      }));
      return;
    }

    setErrors((p) => ({ ...p, banner: undefined }));
    const localUrl = URL.createObjectURL(file);
    setBannerPreview(localUrl);

    setUploading(true);
    try {
      const { url } = await uploadService.uploadImage(file, 'expo_banner');
      setForm((p) => ({ ...p, bannerUrl: url }));
      setBannerPreview(url);
    } catch {
      setErrors((p) => ({
        ...p,
        banner: 'Banner upload failed. Please try again.',
      }));
      setBannerPreview(form.bannerUrl ?? '');
    } finally {
      setUploading(false);
    }
  };

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
        totalBooths: computedTotalBooths,
        zones: form.zones.map(z => ({
          name: z.name.trim(),
          boothCount: Number(z.boothCount),
        })),
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

  type SimpleFieldKey = Exclude<keyof ExpoFormData, 'totalBooths' | 'description' | 'zones'>;

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

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-lg-token">

      <BentoCard className="p-md-token md:p-lg-token">
        <div className="flex items-center gap-2 mb-md-token pb-sm-token border-b border-border-base-dark/30">
          <FileText className={`w-4 h-4 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`} />
          <h3 className={`text-base-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
            Basic Information
          </h3>
        </div>

        <div className="flex flex-col gap-md-token">
          {field('name', 'Expo Name', 'text', 'e.g. TechFest 2025', true)}

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
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </BentoCard>

      <BentoCard className="p-md-token md:p-lg-token">
        <div className="flex items-center gap-2 mb-md-token pb-sm-token border-b border-border-base-dark/30">
          <Image className={`w-4 h-4 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`} />
          <h3 className={`text-base-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
            Banner Image
          </h3>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-lg-token">
          <div className="w-full md:w-1/2">
            <label htmlFor="banner-upload" className={labelClass}>
              Banner Image (PNG/JPG/WebP, max 5 MB)
            </label>
            <p className={`text-xs-token mb-md-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
              Upload a high-resolution banner for the public expo page and search listings.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={`px-md-token py-sm-token rounded-md-token text-sm-token font-medium border transition-colors disabled:opacity-60 ${
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

          <div className="w-full md:w-1/2 flex items-center justify-center">
            {bannerPreview ? (
              <div className="w-full h-44 rounded-lg-token overflow-hidden border border-border-base-dark/40 shadow-sm">
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className={`w-full h-44 rounded-lg-token border border-dashed flex flex-col items-center justify-center gap-2 ${
                isDarkMode ? 'border-border-base-dark bg-bg-hover-dark/40 text-text-secondary-dark' : 'border-border-base-light bg-bg-hover-light/40 text-text-secondary-light'
              }`}>
                <Image className="w-8 h-8 opacity-40" />
                <span className="text-xs-token">No banner image uploaded</span>
              </div>
            )}
          </div>
        </div>
      </BentoCard>

      <BentoCard className="p-md-token md:p-lg-token">
        <div className="flex items-center gap-2 mb-md-token pb-sm-token border-b border-border-base-dark/30">
          <Calendar className={`w-4 h-4 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`} />
          <h3 className={`text-base-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
            Schedule &amp; Venue
          </h3>
        </div>

        <div className="flex flex-col gap-md-token">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md-token">
            {field('startDate', 'Start Date', 'datetime-local', '', true)}
            {field('endDate', 'End Date', 'datetime-local', '', true)}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md-token">
            {field('venueName', 'Venue Name', 'text', 'e.g. Convention Centre', true)}
            {field('venueAddress', 'Venue Address', 'text', 'e.g. 123 Main St, City', true)}
          </div>
        </div>
      </BentoCard>

      {/* Zone-Based Booth Capacity Editor (Option B) */}
      <BentoCard className="p-md-token md:p-lg-token">
        <div className="flex items-center justify-between gap-2 mb-md-token pb-sm-token border-b border-border-base-dark/30">
          <div className="flex items-center gap-2">
            <Layers className={`w-4 h-4 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`} />
            <h3 className={`text-base-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
              Exhibition Zones &amp; Booth Layout
            </h3>
          </div>
          <span className={`text-xs-token font-semibold px-2.5 py-1 rounded-full ${
            isDarkMode ? 'bg-brand-primary-dark/20 text-brand-primary-dark' : 'bg-brand-primary-light/20 text-brand-primary-light'
          }`}>
            Total Capacity: {computedTotalBooths} Booths
          </span>
        </div>

        <p className={`text-xs-token mb-md-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
          Organize your venue into zones (e.g. Hall A, Hall B, Pavilion). Booth labels like <code>A-01</code>, <code>A-02</code> are auto-generated based on zone names.
        </p>

        <div className="flex flex-col gap-3 mb-md-token">
          {form.zones.map((zone, idx) => (
            <div
              key={idx}
              className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-lg-token border ${
                isDarkMode ? 'bg-bg-surface-dark border-border-base-dark' : 'bg-bg-surface-light border-border-base-light'
              }`}
            >
              <div className="flex-1 w-full sm:w-auto">
                <label className={`block text-xs-token font-medium mb-1 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  Zone Name
                </label>
                <input
                  type="text"
                  value={zone.name}
                  onChange={(e) => handleZoneChange(idx, 'name', e.target.value)}
                  placeholder="e.g. Hall A"
                  className={inputClass()}
                />
              </div>

              <div className="w-full sm:w-36">
                <label className={`block text-xs-token font-medium mb-1 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  Booth Count
                </label>
                <input
                  type="number"
                  min={1}
                  value={zone.boothCount}
                  onChange={(e) => handleZoneChange(idx, 'boothCount', e.target.value)}
                  className={inputClass()}
                />
              </div>

              <div className="self-end sm:self-center pt-2 sm:pt-4">
                <button
                  type="button"
                  onClick={() => handleRemoveZone(idx)}
                  disabled={form.zones.length <= 1}
                  className={`p-2 rounded-md-token transition-colors border ${
                    form.zones.length <= 1
                      ? 'opacity-40 cursor-not-allowed border-transparent'
                      : isDarkMode
                      ? 'border-border-base-dark text-text-danger-dark hover:bg-bg-danger-dark/20'
                      : 'border-border-base-light text-text-danger-light hover:bg-bg-danger-light/20'
                  }`}
                  title="Remove Zone"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {errors.zones && (
          <p role="alert" className={`mb-3 ${errorClass}`}>
            {errors.zones}
          </p>
        )}

        <button
          type="button"
          onClick={handleAddZone}
          className={`inline-flex items-center gap-1.5 px-md-token py-2 rounded-md-token text-xs-token font-semibold border transition-colors ${
            isDarkMode
              ? 'border-border-strong-dark text-brand-primary-dark hover:bg-bg-hover-dark'
              : 'border-border-strong-light text-brand-primary-light hover:bg-bg-hover-light'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Zone
        </button>
      </BentoCard>

      <BentoCard className="p-md-token md:p-lg-token">
        <div className="flex items-center gap-2 mb-md-token pb-sm-token border-b border-border-base-dark/30">
          <Sparkles className={`w-4 h-4 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`} />
          <h3 className={`text-base-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
            Additional Details
          </h3>
        </div>

        <div className="flex flex-col gap-md-token">
          {field('websiteUrl', 'Website URL', 'url', 'https://…')}
          {field('tags', 'Tags (comma-separated)', 'text', 'e.g. tech, innovation, AI')}
          {field('venueMapUrl', 'Venue Map URL', 'url', 'https://maps.google.com/…')}
        </div>
      </BentoCard>

      {submitError && (
        <div
          role="alert"
          className={`text-sm-token ${
            isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
          }`}
        >
          {submitError}
        </div>
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
