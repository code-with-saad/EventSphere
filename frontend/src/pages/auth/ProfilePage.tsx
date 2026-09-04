import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { userService } from '../../services/userService';
import { Header } from '../../components/layout/Header';
import { Sidebar } from '../../components/layout/Sidebar';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';
import {
  User as UserIcon,
  Mail,
  Shield,
  Lock,
  Camera,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function ProfilePage() {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user, updateUser } = useAuth();

  // Profile fields state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle Profile Update (Full Name)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      setProfileMsg({ type: 'error', text: 'Full name must be at least 2 characters.' });
      return;
    }

    setIsSavingProfile(true);
    setProfileMsg(null);

    try {
      const updated = await userService.updateMe({ fullName: fullName.trim() });
      updateUser({ fullName: updated.fullName });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setProfileMsg({
        type: 'error',
        text: err?.response?.data?.message || err?.message || 'Failed to update profile.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Avatar file selection & upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side size check (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Image exceeds 2MB limit. Please choose a smaller photo.' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingAvatar(true);
    setProfileMsg(null);

    try {
      const uploadRes = await userService.uploadAvatar(file);
      const updated = await userService.updateMe({ avatarUrl: uploadRes.url });
      updateUser({ avatarUrl: updated.avatarUrl });
      setProfileMsg({ type: 'success', text: 'Avatar photo updated successfully!' });
    } catch (err: any) {
      setProfileMsg({
        type: 'error',
        text: err?.response?.data?.message || err?.message || 'Failed to upload avatar.',
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Current password is required.' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsSavingPassword(true);

    try {
      await userService.changePassword({
        currentPassword,
        newPassword,
      });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({
        type: 'error',
        text: err?.response?.data?.message || err?.message || 'Failed to change password.',
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const displayName = user?.fullName || user?.email || 'User';

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="My Profile" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token max-w-3xl mx-auto w-full">
          {/* Header Title */}
          <div className="mb-lg-token">
            <h2
              className={`text-2xl-token font-bold leading-tight-token ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}
            >
              Account Settings
            </h2>
            <p
              className={`text-sm-token mt-xs-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              Manage your personal information, avatar, appearance, and account security.
            </p>
          </div>

          <div className="flex flex-col gap-lg-token">
            {/* ── Section 1: Profile & Avatar ────────────────────────────── */}
            <BentoCard>
              <div className="flex flex-col gap-md-token">
                <h3
                  className={`text-base-token font-semibold ${
                    isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                  }`}
                >
                  Personal Information
                </h3>

                {profileMsg && (
                  <div
                    className={`flex items-center gap-2 p-sm-token rounded-md-token text-xs-token font-medium ${
                      profileMsg.type === 'success'
                        ? isDarkMode
                          ? 'bg-bg-success-dark text-text-success-dark border border-text-success-dark/30'
                          : 'bg-bg-success-light text-text-success-light border border-text-success-light/30'
                        : isDarkMode
                          ? 'bg-bg-danger-dark text-text-danger-dark border border-text-danger-dark/30'
                          : 'bg-bg-danger-light text-text-danger-light border border-text-danger-light/30'
                    }`}
                  >
                    {profileMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{profileMsg.text}</span>
                  </div>
                )}

                {/* Avatar uploader */}
                <div className="flex items-center gap-md-token pt-xs-token pb-sm-token border-b border-border-base-dark/20">
                  <div className="relative group">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={displayName}
                        className="w-16 h-16 rounded-full object-cover border-2 border-brand-primary-dark/40"
                      />
                    ) : (
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${
                          isDarkMode
                            ? 'bg-brand-primary-dark text-text-on-primary-dark'
                            : 'bg-brand-primary-light text-text-on-primary-light'
                        }`}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isUploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                      aria-label="Upload profile picture"
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5" />
                      )}
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>

                  <div className="flex flex-col">
                    <span
                      className={`text-sm-token font-semibold ${
                        isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                      }`}
                    >
                      Profile Photo
                    </span>
                    <span
                      className={`text-xs-token ${
                        isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                      }`}
                    >
                      PNG, JPEG, or WebP up to 2MB.
                    </span>
                    <button
                      type="button"
                      disabled={isUploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                      className={`mt-1 text-xs-token font-medium underline text-left cursor-pointer hover:opacity-80 transition-opacity ${
                        isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                      }`}
                    >
                      {isUploadingAvatar ? 'Uploading...' : 'Change avatar'}
                    </button>
                  </div>
                </div>

                {/* Form fields */}
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-md-token mt-sm-token">
                  {/* Full Name */}
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="fullName"
                      className={`text-xs-token font-medium flex items-center gap-1.5 ${
                        isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                      }`}
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Your full name"
                      className={`px-sm-token py-2 rounded-md-token border text-sm-token outline-none transition-colors ${
                        isDarkMode
                          ? 'bg-glass-dark border-border-base-dark text-text-primary-dark placeholder-text-tertiary-dark focus:border-brand-primary-dark'
                          : 'bg-glass-light border-border-base-light text-text-primary-light placeholder-text-tertiary-light focus:border-brand-primary-light'
                      }`}
                    />
                  </div>

                  {/* Email (Read-only) */}
                  <div className="flex flex-col gap-1">
                    <label
                      className={`text-xs-token font-medium flex items-center gap-1.5 ${
                        isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Email Address (Read-only)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user?.email || ''}
                      className={`px-sm-token py-2 rounded-md-token border text-sm-token cursor-not-allowed opacity-75 ${
                        isDarkMode
                          ? 'bg-black/20 border-border-base-dark text-text-muted-dark'
                          : 'bg-black/5 border-border-base-light text-text-muted-light'
                      }`}
                    />
                  </div>

                  {/* Role & Status (Read-only) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-md-token">
                    <div className="flex flex-col gap-1">
                      <label
                        className={`text-xs-token font-medium flex items-center gap-1.5 ${
                          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Role
                      </label>
                      <input
                        type="text"
                        disabled
                        value={user?.role?.toUpperCase() || ''}
                        className={`px-sm-token py-2 rounded-md-token border text-sm-token font-semibold cursor-not-allowed opacity-75 ${
                          isDarkMode
                            ? 'bg-black/20 border-border-base-dark text-text-muted-dark'
                            : 'bg-black/5 border-border-base-light text-text-muted-light'
                        }`}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label
                        className={`text-xs-token font-medium flex items-center gap-1.5 ${
                          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Account Status
                      </label>
                      <input
                        type="text"
                        disabled
                        value={user?.status?.toUpperCase() || ''}
                        className={`px-sm-token py-2 rounded-md-token border text-sm-token font-semibold capitalize cursor-not-allowed opacity-75 ${
                          isDarkMode
                            ? 'bg-black/20 border-border-base-dark text-text-success-dark'
                            : 'bg-black/5 border-border-base-light text-text-success-light'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-xs-token">
                    <button
                      type="submit"
                      disabled={isSavingProfile || fullName === user?.fullName}
                      className={`inline-flex items-center justify-center gap-2 px-md-token py-2 rounded-md-token text-sm-token font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDarkMode
                          ? 'bg-brand-primary-dark text-text-on-primary-dark hover:opacity-90'
                          : 'bg-brand-primary-light text-text-on-primary-light hover:opacity-90'
                      }`}
                    >
                      {isSavingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              </div>
            </BentoCard>

            {/* ── Section 2: Preferences (Theme) ─────────────────────────── */}
            <BentoCard>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md-token">
                <div>
                  <h3
                    className={`text-base-token font-semibold ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}
                  >
                    Theme Preference
                  </h3>
                  <p
                    className={`text-xs-token mt-0.5 ${
                      isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                    }`}
                  >
                    Switch between Dark and Light mode theme presets.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`inline-flex items-center gap-2 px-md-token py-2 rounded-md-token text-sm-token font-medium border transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'bg-bg-hover-dark border-border-base-dark text-text-primary-dark hover:bg-white/10'
                      : 'bg-bg-hover-light border-border-base-light text-text-primary-light hover:bg-black/5'
                  }`}
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-brand-primary-dark" /> : <Moon className="w-4 h-4 text-brand-primary-light" />}
                  <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>
            </BentoCard>

            {/* ── Section 3: In-Session Change Password ──────────────────── */}
            <BentoCard>
              <div className="flex flex-col gap-md-token">
                <div>
                  <h3
                    className={`text-base-token font-semibold flex items-center gap-2 ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    Change Password
                  </h3>
                  <p
                    className={`text-xs-token mt-0.5 ${
                      isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                    }`}
                  >
                    Update your current password without leaving your active session.
                  </p>
                </div>

                {passwordMsg && (
                  <div
                    className={`flex items-center gap-2 p-sm-token rounded-md-token text-xs-token font-medium ${
                      passwordMsg.type === 'success'
                        ? isDarkMode
                          ? 'bg-bg-success-dark text-text-success-dark border border-text-success-dark/30'
                          : 'bg-bg-success-light text-text-success-light border border-text-success-light/30'
                        : isDarkMode
                          ? 'bg-bg-danger-dark text-text-danger-dark border border-text-danger-dark/30'
                          : 'bg-bg-danger-light text-text-danger-light border border-text-danger-light/30'
                    }`}
                  >
                    {passwordMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{passwordMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="flex flex-col gap-md-token">
                  {/* Current Password */}
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="currentPassword"
                      className={`text-xs-token font-medium ${
                        isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                      }`}
                    >
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className={`w-full pl-sm-token pr-10 py-2 rounded-md-token border text-sm-token outline-none transition-colors ${
                          isDarkMode
                            ? 'bg-glass-dark border-border-base-dark text-text-primary-dark placeholder-text-tertiary-dark focus:border-brand-primary-dark'
                            : 'bg-glass-light border-border-base-light text-text-primary-light placeholder-text-tertiary-light focus:border-brand-primary-light'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors cursor-pointer ${
                          isDarkMode
                            ? 'text-text-secondary-dark hover:text-text-primary-dark'
                            : 'text-text-secondary-light hover:text-text-primary-light'
                        }`}
                        aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                      >
                        {showCurrentPassword ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-md-token">
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="newPassword"
                        className={`text-xs-token font-medium ${
                          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                        }`}
                      >
                        New Password (min 8 chars)
                      </label>
                      <div className="relative">
                        <input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          placeholder="••••••••"
                          className={`w-full pl-sm-token pr-10 py-2 rounded-md-token border text-sm-token outline-none transition-colors ${
                            isDarkMode
                              ? 'bg-glass-dark border-border-base-dark text-text-primary-dark placeholder-text-tertiary-dark focus:border-brand-primary-dark'
                              : 'bg-glass-light border-border-base-light text-text-primary-light placeholder-text-tertiary-light focus:border-brand-primary-light'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors cursor-pointer ${
                            isDarkMode
                              ? 'text-text-secondary-dark hover:text-text-primary-dark'
                              : 'text-text-secondary-light hover:text-text-primary-light'
                          }`}
                          aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        >
                          {showNewPassword ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="confirmPassword"
                        className={`text-xs-token font-medium ${
                          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                        }`}
                      >
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          placeholder="••••••••"
                          className={`w-full pl-sm-token pr-10 py-2 rounded-md-token border text-sm-token outline-none transition-colors ${
                            isDarkMode
                              ? 'bg-glass-dark border-border-base-dark text-text-primary-dark placeholder-text-tertiary-dark focus:border-brand-primary-dark'
                              : 'bg-glass-light border-border-base-light text-text-primary-light placeholder-text-tertiary-light focus:border-brand-primary-light'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors cursor-pointer ${
                            isDarkMode
                              ? 'text-text-secondary-dark hover:text-text-primary-dark'
                              : 'text-text-secondary-light hover:text-text-primary-light'
                          }`}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-xs-token">
                    <button
                      type="submit"
                      disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className={`inline-flex items-center justify-center gap-2 px-md-token py-2 rounded-md-token text-sm-token font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDarkMode
                          ? 'bg-brand-primary-dark text-text-on-primary-dark hover:opacity-90'
                          : 'bg-brand-primary-light text-text-on-primary-light hover:opacity-90'
                      }`}
                    >
                      {isSavingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Update Password</span>
                    </button>
                  </div>
                </form>
              </div>
            </BentoCard>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
