import { useState, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { uploadService } from '../../services/uploadService';

const CATEGORIES = [
  'Technology', 'Health & Wellness', 'Art & Culture', 'Business',
  'Education', 'Food & Beverage', 'Fashion', 'Sports', 'Entertainment', 'Other',
];

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

interface ApplicationFormData {
  companyName: string;
  companyDescription: string;
  category: string;
  phoneNumber: string;
  websiteUrl: string;
  logoUrl: string;
  organizerNote: string;
}

interface Step1Errors {
  companyName?: string;
  companyDescription?: string;
  category?: string;
  phoneNumber?: string;
}

interface Step2Errors {
  logo?: string;
  websiteUrl?: string;
}

interface ApplicationFormProps {
  initialData?: Partial<ApplicationFormData>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export default function ApplicationForm({
  onSubmit,
  isLoading = false,
  submitLabel = 'Submit Application',
  initialData,
}: ApplicationFormProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<ApplicationFormData>({
    companyName: initialData?.companyName ?? '',
    companyDescription: initialData?.companyDescription ?? '',
    category: initialData?.category ?? '',
    phoneNumber: initialData?.phoneNumber ?? '',
    websiteUrl: initialData?.websiteUrl ?? '',
    logoUrl: initialData?.logoUrl ?? '',
    organizerNote: initialData?.organizerNote ?? '',
  });
  const [step1Errors, setStep1Errors] = useState<Step1Errors>({});
  const [step2Errors, setStep2Errors] = useState<Step2Errors>({});
  const [logoPreview, setLogoPreview] = useState(initialData?.logoUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync initialData if loaded asynchronously (e.g. edit mode or previous application autofill)
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    if (initialData) {
      setForm((prev) => ({
        companyName: initialData.companyName ?? prev.companyName,
        companyDescription: initialData.companyDescription ?? prev.companyDescription,
        category: initialData.category ?? prev.category,
        phoneNumber: initialData.phoneNumber ?? prev.phoneNumber,
        websiteUrl: initialData.websiteUrl ?? prev.websiteUrl,
        logoUrl: initialData.logoUrl ?? prev.logoUrl,
        organizerNote: initialData.organizerNote ?? prev.organizerNote,
      }));
      if (initialData.logoUrl) {
        setLogoPreview(initialData.logoUrl);
      }
    }
  }



  const labelClass = `block text-sm-token font-medium mb-xs-token ${
    isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
  }`;

  const inputClass = (hasError?: string) =>
    `w-full rounded-md-token border px-sm-token py-xs-token text-sm-token outline-none focus:ring-0 transition-colors ${
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

  const requiredStar = `text-xs-token ${
    isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
  }`;

  const primaryBtn = `px-md-token py-xs-token rounded-md-token text-sm-token font-semibold transition-colors disabled:opacity-60 ${
    isDarkMode
      ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-accent-hover-dark'
      : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light'
  }`;

  const secondaryBtn = `px-md-token py-xs-token rounded-md-token text-sm-token font-medium border transition-colors ${
    isDarkMode
      ? 'border-border-base-dark text-text-primary-dark hover:bg-bg-hover-dark'
      : 'border-border-base-light text-text-primary-light hover:bg-bg-hover-light'
  }`;


  const validateStep1 = (): boolean => {
    const errors: Step1Errors = {};
    if (!form.companyName.trim()) {
      errors.companyName = 'Company name is required';
    } else if (form.companyName.length > 120) {
      errors.companyName = 'Must be 120 characters or fewer';
    }
    if (!form.companyDescription.trim()) {
      errors.companyDescription = 'Description is required';
    } else if (form.companyDescription.length > 500) {
      errors.companyDescription = 'Must be 500 characters or fewer';
    }
    if (!form.category) {
      errors.category = 'Please select a category';
    }
    if (!form.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    } else {
      const phonePattern = /^[+\d\s\-().]{7,20}$/;
      if (!phonePattern.test(form.phoneNumber.trim())) {
        errors.phoneNumber = 'Enter a valid phone number (digits, spaces, +, - only)';
      }
    }
    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      setStep2Errors(prev => ({ ...prev, logo: 'Only PNG, JPG, or WebP images are allowed' }));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setStep2Errors(prev => ({ ...prev, logo: 'Logo must be 2 MB or smaller' }));
      return;
    }

    setStep2Errors(prev => ({ ...prev, logo: undefined }));
    setLogoPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const { url } = await uploadService.uploadImage(file, 'company_logo');
      setForm(prev => ({ ...prev, logoUrl: url }));
      setLogoPreview(url);
    } catch {
      setStep2Errors(prev => ({ ...prev, logo: 'Upload failed. Please try again.' }));
      setLogoPreview('');
    } finally {
      setUploading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      const payload: Record<string, unknown> = {
        companyName: form.companyName.trim(),
        companyDescription: form.companyDescription.trim(),
        category: form.category,
        phoneNumber: form.phoneNumber.trim(),
      };
      if (form.websiteUrl.trim()) payload.websiteUrl = form.websiteUrl.trim();
      if (form.logoUrl) payload.logoUrl = form.logoUrl;
      if (form.organizerNote.trim()) payload.organizerNote = form.organizerNote.trim();
      await onSubmit(payload);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            ?? 'Submission failed. Please try again.';
      setSubmitError(message);
    }
  };

  const update =
    (field: keyof ApplicationFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value })); 

  const Progress = () => (
    <nav aria-label="Form progress" className="flex items-center gap-xs-token mb-lg-token">
      {([1, 2] as const).map((s) => (
        <div key={s} className="flex items-center gap-xs-token">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs-token font-semibold ${
              s === step
                ? isDarkMode
                  ? 'bg-brand-primary-dark text-text-on-primary-dark'
                  : 'bg-brand-primary-light text-text-on-primary-light'
                : s < step
                  ? isDarkMode
                    ? 'bg-accent-bg-dark text-brand-primary-dark'
                    : 'bg-accent-bg-light text-brand-primary-light'
                  : isDarkMode
                    ? 'bg-bg-surface-dark text-text-secondary-dark border border-border-base-dark'
                    : 'bg-bg-surface-light text-text-secondary-light border border-border-base-light'
            }`}
            aria-current={s === step ? 'step' : undefined}
          >
            {s < step ? '1' : s}
          </div>
          <span
            className={`text-xs-token hidden sm:inline ${
              s === step
                ? isDarkMode
                  ? 'text-text-primary-dark font-medium'
                  : 'text-text-primary-light font-medium'
                : isDarkMode
                  ? 'text-text-secondary-dark'
                  : 'text-text-secondary-light'
            }`}
          >
            {s === 1 ? 'Company Info' : 'Additional Details'}
          </span>
          {s < 2 && (
            <div
              className={`h-px w-8 mx-xs-token ${
                isDarkMode ? 'bg-border-base-dark' : 'bg-border-base-light'
              }`}
            />
          )}
        </div>
      ))}
    </nav>
  );


  const renderStep1 = () => (
    <div className="flex flex-col gap-md-token">
      {/* Company Name */}
      <div>
        <label htmlFor="companyName" className={labelClass}>
          Company Name{' '}
          <span aria-hidden="true" className={requiredStar}>*</span>
        </label>
        <input
          id="companyName"
          type="text"
          value={form.companyName}
          onChange={update('companyName')}
          placeholder="Your company name"
          className={inputClass(step1Errors.companyName)}
          aria-describedby={step1Errors.companyName ? 'companyName-error' : undefined}
          aria-required="true"
          aria-invalid={!!step1Errors.companyName}
          maxLength={120}
        />
        {step1Errors.companyName && (
          <p id="companyName-error" role="alert" className={errorClass}>
            {step1Errors.companyName}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="companyDescription" className={labelClass}>
          Description{' '}
          <span aria-hidden="true" className={requiredStar}>*</span>
        </label>
        <textarea
          id="companyDescription"
          rows={3}
          value={form.companyDescription}
          onChange={update('companyDescription')}
          placeholder="Describe your company and what you offer"
          className={`${inputClass(step1Errors.companyDescription)} resize-y`}
          aria-describedby={step1Errors.companyDescription ? 'companyDescription-error' : undefined}
          aria-required="true"
          aria-invalid={!!step1Errors.companyDescription}
          maxLength={500}
        />
        {step1Errors.companyDescription && (
          <p id="companyDescription-error" role="alert" className={errorClass}>
            {step1Errors.companyDescription}
          </p>
        )}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className={labelClass}>
          Category{' '}
          <span aria-hidden="true" className={requiredStar}>*</span>
        </label>
        <select
          id="category"
          value={form.category}
          onChange={update('category')}
          className={inputClass(step1Errors.category)}
          aria-describedby={step1Errors.category ? 'category-error' : undefined}
          aria-required="true"
          aria-invalid={!!step1Errors.category}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {step1Errors.category && (
          <p id="category-error" role="alert" className={errorClass}>
            {step1Errors.category}
          </p>
        )}
      </div>

      {/* Phone Number */}
      <div>
        <label htmlFor="phoneNumber" className={labelClass}>
          Phone Number{' '}
          <span aria-hidden="true" className={requiredStar}>*</span>
        </label>
        <input
          id="phoneNumber"
          type="tel"
          value={form.phoneNumber}
          onChange={update('phoneNumber')}
          placeholder="+1 234 567 8900"
          className={inputClass(step1Errors.phoneNumber)}
          aria-describedby={step1Errors.phoneNumber ? 'phoneNumber-error' : undefined}
          aria-required="true"
          aria-invalid={!!step1Errors.phoneNumber}
        />
        {step1Errors.phoneNumber && (
          <p id="phoneNumber-error" role="alert" className={errorClass}>
            {step1Errors.phoneNumber}
          </p>
        )}
      </div>

      <div className="flex justify-end mt-sm-token">
        <button
          type="button"
          onClick={() => {
            if (validateStep1()) setStep(2);
          }}
          className={primaryBtn}
        >
          Continue
        </button>
      </div>
    </div>
  );


  const renderStep2 = () => (
    <div className="flex flex-col gap-md-token">
      {/* Logo upload */}
      <div>
        <label htmlFor="logo-upload" className={labelClass}>
          Company Logo{' '}
          <span
            className={`text-xs-token font-regular ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}
          >
            (PNG / JPG / WebP, max 2 MB)
          </span>
        </label>
        <div className="flex flex-col gap-sm-token">
          {logoPreview && (
            <img
              src={logoPreview}
              alt="Logo preview"
              className={`w-20 h-20 object-contain rounded-md-token border ${
                isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'
              }`}
            />
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`${secondaryBtn} disabled:opacity-60 self-start`}
          >
            {uploading ? 'Uploading' : logoPreview ? 'Change Logo' : 'Upload Logo'}
          </button>
          <input
            ref={fileInputRef}
            id="logo-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleLogoChange}
            className="sr-only"
            aria-label="Upload company logo"
          />
          {step2Errors.logo && (
            <p role="alert" className={errorClass}>
              {step2Errors.logo}
            </p>
          )}
        </div>
      </div>

      {/* Website URL */}
      <div>
        <label htmlFor="websiteUrl" className={labelClass}>
          Website URL
        </label>
        <input
          id="websiteUrl"
          type="url"
          value={form.websiteUrl}
          onChange={update('websiteUrl')}
          placeholder="https://yourcompany.com"
          className={inputClass(step2Errors.websiteUrl)}
          aria-describedby={step2Errors.websiteUrl ? 'websiteUrl-error' : undefined}
          aria-invalid={!!step2Errors.websiteUrl}
        />
        {step2Errors.websiteUrl && (
          <p id="websiteUrl-error" role="alert" className={errorClass}>
            {step2Errors.websiteUrl}
          </p>
        )}
      </div>

      {/* Note to organizer */}
      <div>
        <label htmlFor="organizerNote" className={labelClass}>
          Note to Organizer
        </label>
        <textarea
          id="organizerNote"
          rows={3}
          value={form.organizerNote}
          onChange={update('organizerNote')}
          placeholder="Anything you'd like the organizer to know"
          className={`${inputClass()} resize-y`}
        />
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

      <div className="flex justify-between mt-sm-token">
        <button type="button" onClick={() => setStep(1)} className={secondaryBtn}>
          Back
        </button>
        <button
          type="submit"
          disabled={isLoading || uploading}
          className={`${primaryBtn} disabled:opacity-60`}
        >
          {isLoading ? 'Submitting' : submitLabel}
        </button>
      </div>
    </div>
  );



  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Exhibitor application form">
      <Progress />
      {step === 1 ? renderStep1() : renderStep2()}
    </form>
  );
}

