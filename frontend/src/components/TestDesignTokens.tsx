import { useState } from 'react';

/**
 * Test page to verify EventSphere design tokens
 * This component demonstrates:
 * - Design token classes from tailwind.config.js
 * - Background, text, border, and brand colors
 * - Typography tokens
 * - Spacing and border radius tokens
 * - Dark/Light mode toggle
 */
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
      {/* Header with Glass Effect */}
      <header 
        className={`border-b p-6 mb-8 sticky top-4 rounded-xl-token backdrop-blur-md ${
          isDarkMode 
            ? 'bg-bg-surface-dark/80 border-border-base-dark' 
            : 'bg-bg-surface-light/80 border-border-base-light'
        }`}
      >
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">EventSphere Design Tokens Test</h1>
          <button
            onClick={toggleTheme}
            className={`px-4 py-2 rounded-lg-token transition-all hover:opacity-90 ${
              isDarkMode 
                ? 'bg-brand-primary-dark text-text-on-primary-dark' 
                : 'bg-brand-primary-light text-text-on-primary-light'
            }`}
          >
            {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Section: Bento Cards */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Component Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div 
              className={`p-6 hover:shadow-lg transition-shadow duration-200 border rounded-xl-token ${
                isDarkMode 
                  ? 'bg-bg-surface-dark border-border-base-dark' 
                  : 'bg-bg-surface-light border-border-base-light'
              }`}
            >
              <h3 className="text-xl font-semibold mb-2">Dashboard</h3>
              <p className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>
                Role-specific dashboard view with key metrics and actions.
              </p>
            </div>

            {/* Card 2 */}
            <div 
              className={`p-6 hover:shadow-lg transition-shadow duration-200 border rounded-xl-token ${
                isDarkMode 
                  ? 'bg-bg-surface-dark border-border-base-dark' 
                  : 'bg-bg-surface-light border-border-base-light'
              }`}
            >
              <h3 className="text-xl font-semibold mb-2">Events</h3>
              <p className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>
                Manage and browse upcoming events and expos.
              </p>
            </div>

            {/* Card 3 */}
            <div 
              className={`p-6 hover:shadow-lg transition-shadow duration-200 border rounded-xl-token ${
                isDarkMode 
                  ? 'bg-bg-surface-dark border-border-base-dark' 
                  : 'bg-bg-surface-light border-border-base-light'
              }`}
            >
              <h3 className="text-xl font-semibold mb-2">Profile</h3>
              <p className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>
                View and edit your account information.
              </p>
            </div>
          </div>
        </section>

        {/* Section: Accent Colors - CTAs & Highlights */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Brand Colors - Buttons & Links</h2>
          <div className="flex flex-wrap gap-4">
            <button 
              className={`px-6 py-3 rounded-lg-token font-medium hover:opacity-90 transition-opacity ${
                isDarkMode 
                  ? 'bg-brand-primary-dark text-text-on-primary-dark' 
                  : 'bg-brand-primary-light text-text-on-primary-light'
              }`}
            >
              Primary CTA
            </button>
            <button 
              className={`px-6 py-3 rounded-lg-token font-medium hover:opacity-90 transition-opacity ${
                isDarkMode 
                  ? 'bg-brand-secondary-dark text-text-on-primary-dark' 
                  : 'bg-brand-secondary-light text-text-on-primary-light'
              }`}
            >
              Secondary CTA
            </button>
            <a 
              className={`px-4 py-2 rounded-lg-token font-medium inline-block ${
                isDarkMode 
                  ? 'text-brand-primary-dark hover:text-brand-secondary-dark' 
                  : 'text-brand-primary-light hover:text-brand-secondary-light'
              }`}
            >
              Brand Link →
            </a>
          </div>
        </section>

        {/* Section: Status Badges with Status Colors */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Status Colors - State Badges</h2>
          <div className="flex flex-wrap gap-4">
            <span 
              className={`px-4 py-2 rounded-lg-token font-medium ${
                isDarkMode 
                  ? 'text-text-success-dark bg-bg-success-dark' 
                  : 'text-text-success-light bg-bg-success-light'
              }`}
            >
              ✓ Active
            </span>
            <span 
              className={`px-4 py-2 rounded-lg-token font-medium ${
                isDarkMode 
                  ? 'text-text-success-dark bg-bg-success-dark' 
                  : 'text-text-success-light bg-bg-success-light'
              }`}
            >
              ✓ Verified
            </span>
            <span 
              className={`px-4 py-2 rounded-lg-token font-medium ${
                isDarkMode 
                  ? 'text-text-warning-dark bg-bg-warning-dark' 
                  : 'text-text-warning-light bg-bg-warning-light'
              }`}
            >
              ⏳ Pending
            </span>
            <span 
              className={`px-4 py-2 rounded-lg-token font-medium ${
                isDarkMode 
                  ? 'text-text-danger-dark bg-bg-danger-dark' 
                  : 'text-text-danger-light bg-bg-danger-light'
              }`}
            >
              ✖ Error
            </span>
          </div>
        </section>

        {/* Section: Glass Component Preview */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Glass Effect Component</h2>
          <div 
            className={`relative h-64 overflow-hidden rounded-xl-token ${
              isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'
            }`}
          >
            {/* Simulated sidebar with glass effect */}
            <div 
              className={`absolute left-0 top-0 bottom-0 w-64 p-6 border-r backdrop-blur-md ${
                isDarkMode 
                  ? 'bg-bg-surface-dark/50 border-border-base-dark' 
                  : 'bg-bg-surface-light/70 border-border-base-light'
              }`}
            >
              <div className="space-y-4">
                <div className="font-bold text-lg">
                  Navigation
                </div>
                <div className="space-y-2">
                  <div 
                    className={`p-2 rounded-md-token transition-colors cursor-pointer ${
                      isDarkMode 
                        ? 'text-text-primary-dark hover:bg-bg-hover-dark' 
                        : 'text-text-primary-light hover:bg-bg-hover-light'
                    }`}
                  >
                    Dashboard
                  </div>
                  <div 
                    className={`p-2 rounded-md-token transition-colors cursor-pointer ${
                      isDarkMode 
                        ? 'text-text-primary-dark hover:bg-bg-hover-dark' 
                        : 'text-text-primary-light hover:bg-bg-hover-light'
                    }`}
                  >
                    Events
                  </div>
                  <div 
                    className={`p-2 rounded-md-token transition-colors cursor-pointer ${
                      isDarkMode 
                        ? 'text-text-primary-dark hover:bg-bg-hover-dark' 
                        : 'text-text-primary-light hover:bg-bg-hover-light'
                    }`}
                  >
                    Profile
                  </div>
                </div>
              </div>
            </div>
            <div 
              className={`absolute right-4 top-4 text-sm-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              ← Glass effect with backdrop blur
            </div>
          </div>
        </section>

        {/* Section: Color Palette Reference */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Design Token Reference</h2>
          <div 
            className={`p-6 border rounded-xl-token ${
              isDarkMode 
                ? 'bg-bg-surface-dark border-border-base-dark' 
                : 'bg-bg-surface-light border-border-base-light'
            }`}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="w-full h-20 rounded-lg-token mb-2 bg-bg-base-dark"></div>
                <p className="text-sm-token font-medium">Base Dark</p>
                <p className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>#0B1120</p>
              </div>
              <div>
                <div className="w-full h-20 rounded-lg-token mb-2 bg-bg-surface-dark border border-border-base-dark"></div>
                <p className="text-sm-token font-medium">Surface Dark</p>
                <p className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>#1E293B</p>
              </div>
              <div>
                <div className="w-full h-20 rounded-lg-token mb-2 bg-brand-primary-dark"></div>
                <p className="text-sm-token font-medium">Brand Primary Dark</p>
                <p className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>#818CF8</p>
              </div>
              <div>
                <div className="w-full h-20 rounded-lg-token mb-2 bg-brand-secondary-dark"></div>
                <p className="text-sm-token font-medium">Brand Secondary Dark</p>
                <p className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>#22D3EE</p>
              </div>
              <div>
                <div className="w-full h-20 rounded-lg-token mb-2 bg-text-success-dark"></div>
                <p className="text-sm-token font-medium">Success</p>
                <p className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>#4ADE80</p>
              </div>
              <div>
                <div className="w-full h-20 rounded-lg-token mb-2 bg-text-warning-dark"></div>
                <p className="text-sm-token font-medium">Warning</p>
                <p className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>#FBBF24</p>
              </div>
              <div>
                <div className="w-full h-20 rounded-lg-token mb-2 bg-text-danger-dark"></div>
                <p className="text-sm-token font-medium">Danger</p>
                <p className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>#F87171</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Design Token Values */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">EventSphere Design Token Classes</h2>
          <div 
            className={`p-6 border rounded-xl-token ${
              isDarkMode 
                ? 'bg-bg-surface-dark border-border-base-dark' 
                : 'bg-bg-surface-light border-border-base-light'
            }`}
          >
            <div className="space-y-3 font-mono text-sm-token">
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>Background Base:</span>
                <span>bg-bg-base-dark / bg-bg-base-light</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>Background Surface:</span>
                <span>bg-bg-surface-dark / bg-bg-surface-light</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>Border:</span>
                <span>border-border-base-dark / border-border-base-light</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>Text Primary:</span>
                <span>text-text-primary-dark / text-text-primary-light</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>Text Secondary:</span>
                <span>text-text-secondary-dark / text-text-secondary-light</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>Brand Primary:</span>
                <span>bg-brand-primary-dark / bg-brand-primary-light</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>Brand Secondary:</span>
                <span>bg-brand-secondary-dark / bg-brand-secondary-light</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>Border Radius:</span>
                <span>rounded-sm-token / md-token / lg-token / xl-token</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>Font Size:</span>
                <span>text-xs-token / sm-token / base-token / lg-token / xl-token</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>Spacing:</span>
                <span>xs-token / sm-token / md-token / lg-token / xl-token / xxl-token</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
