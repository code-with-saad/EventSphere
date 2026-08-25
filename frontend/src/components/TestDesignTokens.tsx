import { useState } from 'react';
import { Sun, Moon, Check, X, Clock } from 'lucide-react';

export function TestDesignTokens() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  };

  return (
    <div className={`min-h-screen p-8 transition-colors duration-300 ${isDarkMode ? 'bg-bg-base-dark text-text-primary-dark' : 'bg-bg-base-light text-text-primary-light'}`}>

      {/* Header */}
      <header className={`border-b p-6 mb-8 sticky top-4 rounded-xl-token backdrop-blur-md ${
        isDarkMode
          ? 'bg-bg-surface-dark/80 border-border-base-dark'
          : 'bg-bg-surface-light/80 border-border-base-light'
      }`}>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">EventSphere Design Tokens Test</h1>
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg-token transition-all hover:opacity-90 ${
              isDarkMode
                ? 'bg-brand-primary-dark text-text-on-primary-dark'
                : 'bg-brand-primary-light text-text-on-primary-light'
            }`}
          >
            {isDarkMode
              ? <><Sun  className="w-4 h-4" aria-hidden="true" /> Light Mode</>
              : <><Moon className="w-4 h-4" aria-hidden="true" /> Dark Mode</>
            }
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto space-y-8">

        {/* Component Cards */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Component Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Dashboard', desc: 'Role-specific dashboard view with key metrics and actions.' },
              { title: 'Events',    desc: 'Manage and browse upcoming events and expos.' },
              { title: 'Profile',   desc: 'View and edit your account information.' },
            ].map(({ title, desc }) => (
              <div key={title} className={`p-6 hover:shadow-lg transition-shadow border rounded-xl-token ${
                isDarkMode ? 'bg-bg-surface-dark border-border-base-dark' : 'bg-bg-surface-light border-border-base-light'
              }`}>
                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                <p className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Brand Colors */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Brand Colors - Buttons &amp; Links</h2>
          <div className="flex flex-wrap gap-4">
            <button className={`px-6 py-3 rounded-lg-token font-medium hover:opacity-90 transition-opacity ${isDarkMode ? 'bg-brand-primary-dark text-text-on-primary-dark' : 'bg-brand-primary-light text-text-on-primary-light'}`}>Primary CTA</button>
            <button className={`px-6 py-3 rounded-lg-token font-medium hover:opacity-90 transition-opacity ${isDarkMode ? 'bg-brand-secondary-dark text-text-on-primary-dark' : 'bg-brand-secondary-light text-text-on-primary-light'}`}>Secondary CTA</button>
            <a className={`px-4 py-2 rounded-lg-token font-medium inline-block ${isDarkMode ? 'text-brand-primary-dark hover:text-brand-secondary-dark' : 'text-brand-primary-light hover:text-brand-secondary-light'}`}>Brand Link</a>
          </div>
        </section>

        {/* Status Badges */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Status Colors - State Badges</h2>
          <div className="flex flex-wrap gap-4">
            <span className={`flex items-center gap-1 px-4 py-2 rounded-lg-token font-medium ${isDarkMode ? 'text-text-success-dark bg-bg-success-dark' : 'text-text-success-light bg-bg-success-light'}`}>
              <Check className="w-4 h-4" aria-hidden="true" /> Active
            </span>
            <span className={`flex items-center gap-1 px-4 py-2 rounded-lg-token font-medium ${isDarkMode ? 'text-text-success-dark bg-bg-success-dark' : 'text-text-success-light bg-bg-success-light'}`}>
              <Check className="w-4 h-4" aria-hidden="true" /> Verified
            </span>
            <span className={`flex items-center gap-1 px-4 py-2 rounded-lg-token font-medium ${isDarkMode ? 'text-text-warning-dark bg-bg-warning-dark' : 'text-text-warning-light bg-bg-warning-light'}`}>
              <Clock className="w-4 h-4" aria-hidden="true" /> Pending
            </span>
            <span className={`flex items-center gap-1 px-4 py-2 rounded-lg-token font-medium ${isDarkMode ? 'text-text-danger-dark bg-bg-danger-dark' : 'text-text-danger-light bg-bg-danger-light'}`}>
              <X className="w-4 h-4" aria-hidden="true" /> Error
            </span>
          </div>
        </section>

        {/* Glass preview */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Glass Effect Component</h2>
          <div className={`relative h-64 overflow-hidden rounded-xl-token ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-64 p-6 border-r backdrop-blur-md ${
              isDarkMode ? 'bg-bg-surface-dark/50 border-border-base-dark' : 'bg-bg-surface-light/70 border-border-base-light'
            }`}>
              <div className="space-y-4">
                <div className="font-bold text-lg">Navigation</div>
                <div className="space-y-2">
                  {['Dashboard', 'Events', 'Profile'].map((item) => (
                    <div key={item} className={`p-2 rounded-md-token transition-colors cursor-pointer ${
                      isDarkMode ? 'text-text-primary-dark hover:bg-bg-hover-dark' : 'text-text-primary-light hover:bg-bg-hover-light'
                    }`}>{item}</div>
                  ))}
                </div>
              </div>
            </div>
            <div className={`absolute right-4 top-4 text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
              Glass effect with backdrop blur
            </div>
          </div>
        </section>

        {/* Color Palette */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Design Token Reference</h2>
          <div className={`p-6 border rounded-xl-token ${isDarkMode ? 'bg-bg-surface-dark border-border-base-dark' : 'bg-bg-surface-light border-border-base-light'}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { cls: 'bg-bg-base-dark',          label: 'Base Dark',           hex: '#0B1120' },
                { cls: 'bg-bg-surface-dark border border-border-base-dark', label: 'Surface Dark', hex: '#1E293B' },
                { cls: 'bg-brand-primary-dark',    label: 'Brand Primary Dark',  hex: '#818CF8' },
                { cls: 'bg-brand-secondary-dark',  label: 'Brand Secondary Dark',hex: '#22D3EE' },
                { cls: 'bg-text-success-dark',     label: 'Success',             hex: '#4ADE80' },
                { cls: 'bg-text-warning-dark',     label: 'Warning',             hex: '#FBBF24' },
                { cls: 'bg-text-danger-dark',      label: 'Danger',              hex: '#F87171' },
              ].map(({ cls, label, hex }) => (
                <div key={label}>
                  <div className={`w-full h-20 rounded-lg-token mb-2 ${cls}`} />
                  <p className="text-sm-token font-medium">{label}</p>
                  <p className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>{hex}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Token reference table */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">EventSphere Design Token Classes</h2>
          <div className={`p-6 border rounded-xl-token ${isDarkMode ? 'bg-bg-surface-dark border-border-base-dark' : 'bg-bg-surface-light border-border-base-light'}`}>
            <div className="space-y-3 font-mono text-sm-token">
              {[
                ['Background Base:',    'bg-bg-base-dark / bg-bg-base-light'],
                ['Background Surface:', 'bg-bg-surface-dark / bg-bg-surface-light'],
                ['Border:',             'border-border-base-dark / border-border-base-light'],
                ['Text Primary:',       'text-text-primary-dark / text-text-primary-light'],
                ['Text Secondary:',     'text-text-secondary-dark / text-text-secondary-light'],
                ['Brand Primary:',      'bg-brand-primary-dark / bg-brand-primary-light'],
                ['Brand Secondary:',    'bg-brand-secondary-dark / bg-brand-secondary-light'],
                ['Border Radius:',      'rounded-sm-token / md-token / lg-token / xl-token'],
                ['Font Size:',          'text-xs-token / sm-token / base-token / lg-token / xl-token'],
                ['Spacing:',            'xs-token / sm-token / md-token / lg-token / xl-token / xxl-token'],
              ].map(([key, val]) => (
                <div key={key} className="flex justify-between">
                  <span className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>{key}</span>
                  <span>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
