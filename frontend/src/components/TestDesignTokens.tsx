import { useState } from 'react';

/**
 * Test page to verify EventSphere design tokens
 * This component demonstrates:
 * - Bento Card styling (warm stone theme)
 * - Glass Component styling (warm charcoal glass with backdrop blur)
 * - Accent colors (Amber/Orange for CTAs and highlights)
 * - Status colors (Green/Amber/Red semantic badges)
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

  // Design tokens
  const colors = {
    // Base colors
    baseDark: '#1C1917',
    baseLight: '#FAFAF9',
    
    // Bento cards
    bentoBg: isDarkMode ? '#292524' : 'rgba(250, 250, 249, 0.9)',
    bentoBorder: isDarkMode ? '#44403C' : '#E7E5E4',
    
    // Glass components
    glassBg: isDarkMode ? 'rgba(41, 37, 36, 0.5)' : 'rgba(245, 245, 244, 0.7)',
    glassBorder: isDarkMode ? 'rgba(68, 64, 60, 0.5)' : 'rgba(231, 229, 228, 0.8)',
    
    // Accent colors - CTAs and highlights
    accentAmber: '#F59E0B',
    accentAmberLight: '#FEF3C7',
    accentOrange: '#EA580C',
    accentOrangeLight: '#FFEDD5',
    
    // Status badge colors - Semantic
    statusSuccess: '#22C55E',
    statusSuccessLight: '#DCFCE7',
    statusWarning: '#F59E0B',
    statusWarningLight: '#FEF3C7',
    statusError: '#EF4444',
    statusErrorLight: '#FEE2E2',
  };

  return (
    <div className="min-h-screen p-8 transition-colors duration-300">
      {/* Header with Glass Effect */}
      <header 
        className="border-b p-6 mb-8 sticky top-4"
        style={{
          backgroundColor: colors.glassBg,
          backdropFilter: 'blur(12px)',
          borderColor: colors.glassBorder,
          borderRadius: '1rem',
        }}
      >
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">EventSphere Design Tokens Test</h1>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 text-white rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: colors.accentAmber }}
          >
            {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Section: Bento Cards */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Bento Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Bento Card 1 */}
            <div 
              className="p-6 hover:shadow-lg transition-shadow duration-200 border"
              style={{
                backgroundColor: colors.bentoBg,
                borderColor: colors.bentoBorder,
                borderRadius: '1rem',
              }}
            >
              <h3 className="text-xl font-semibold mb-2">Dashboard</h3>
              <p className={isDarkMode ? 'text-stone-400' : 'text-stone-600'}>
                Role-specific dashboard view with key metrics and actions.
              </p>
            </div>

            {/* Bento Card 2 */}
            <div 
              className="p-6 hover:shadow-lg transition-shadow duration-200 border"
              style={{
                backgroundColor: colors.bentoBg,
                borderColor: colors.bentoBorder,
                borderRadius: '1rem',
              }}
            >
              <h3 className="text-xl font-semibold mb-2">Events</h3>
              <p className={isDarkMode ? 'text-stone-400' : 'text-stone-600'}>
                Manage and browse upcoming events and expos.
              </p>
            </div>

            {/* Bento Card 3 */}
            <div 
              className="p-6 hover:shadow-lg transition-shadow duration-200 border"
              style={{
                backgroundColor: colors.bentoBg,
                borderColor: colors.bentoBorder,
                borderRadius: '1rem',
              }}
            >
              <h3 className="text-xl font-semibold mb-2">Profile</h3>
              <p className={isDarkMode ? 'text-stone-400' : 'text-stone-600'}>
                View and edit your account information.
              </p>
            </div>
          </div>
        </section>

        {/* Section: Accent Colors - CTAs & Highlights */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Accent Colors - CTAs & Highlights</h2>
          <div className="flex flex-wrap gap-4">
            <button 
              className="px-6 py-3 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: colors.accentAmber }}
            >
              Primary CTA
            </button>
            <button 
              className="px-6 py-3 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: colors.accentOrange }}
            >
              Secondary CTA
            </button>
            <a 
              className="px-4 py-2 rounded-lg font-medium inline-block"
              style={{ color: colors.accentAmber }}
            >
              Accent Link →
            </a>
          </div>
        </section>

        {/* Section: Status Badges with Status Colors */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Status Colors (Semantic) - State Badges</h2>
          <div className="flex flex-wrap gap-4">
            <span 
              className="px-4 py-2 text-white rounded-lg font-medium"
              style={{ backgroundColor: colors.statusSuccess }}
            >
              ✓ Active
            </span>
            <span 
              className="px-4 py-2 rounded-lg font-medium"
              style={{ 
                backgroundColor: colors.statusSuccessLight,
                color: colors.statusSuccess,
              }}
            >
              ✓ Verified
            </span>
            <span 
              className="px-4 py-2 text-white rounded-lg font-medium"
              style={{ backgroundColor: colors.statusWarning }}
            >
              ⏳ Pending
            </span>
            <span 
              className="px-4 py-2 text-white rounded-lg font-medium"
              style={{ backgroundColor: colors.statusError }}
            >
              ✖ Error
            </span>
          </div>
        </section>

        {/* Section: Glass Sidebar Preview */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Glass Component (Sidebar Preview)</h2>
          <div 
            className="relative h-64 overflow-hidden"
            style={{
              background: isDarkMode 
                ? 'radial-gradient(circle at top right, rgba(245, 158, 11, 0.15), rgba(41, 37, 36, 0.8) 50%, #1C1917)'
                : 'linear-gradient(135deg, #FAFAF9, #F5F5F4 50%, rgba(245, 158, 11, 0.08))',
              borderRadius: '1rem',
            }}
          >
            {/* Simulated sidebar with glass effect */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-64 p-6 border-r"
              style={{
                backgroundColor: colors.glassBg,
                backdropFilter: 'blur(12px)',
                borderColor: colors.glassBorder,
              }}
            >
              <div className="space-y-4">
                <div 
                  className="font-bold text-lg"
                  style={{ color: isDarkMode ? '#FAFAF9' : '#1C1917' }}
                >
                  Navigation
                </div>
                <div className="space-y-2">
                  <div 
                    className="p-2 rounded transition-colors cursor-pointer"
                    style={{ color: isDarkMode ? '#E7E5E4' : '#292524' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Dashboard
                  </div>
                  <div 
                    className="p-2 rounded transition-colors cursor-pointer"
                    style={{ color: isDarkMode ? '#E7E5E4' : '#292524' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Events
                  </div>
                  <div 
                    className="p-2 rounded transition-colors cursor-pointer"
                    style={{ color: isDarkMode ? '#E7E5E4' : '#292524' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Profile
                  </div>
                </div>
              </div>
            </div>
            <div 
              className="absolute right-4 top-4 text-sm"
              style={{ color: isDarkMode ? '#E7E5E4' : '#44403C' }}
            >
              ← Glass effect with backdrop blur
            </div>
          </div>
        </section>

        {/* Section: Color Palette Reference */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Color Palette Reference</h2>
          <div 
            className="p-6 border"
            style={{
              backgroundColor: colors.bentoBg,
              borderColor: colors.bentoBorder,
              borderRadius: '1rem',
            }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div 
                  className="w-full h-20 rounded-lg mb-2"
                  style={{ backgroundColor: colors.baseDark }}
                ></div>
                <p className="text-sm font-medium">Base Dark</p>
                <p className="text-xs text-stone-500">#1C1917</p>
              </div>
              <div>
                <div 
                  className="w-full h-20 rounded-lg mb-2 border"
                  style={{ backgroundColor: colors.bentoBg, borderColor: colors.bentoBorder }}
                ></div>
                <p className="text-sm font-medium">Bento Card</p>
                <p className="text-xs text-stone-500">#292524</p>
              </div>
              <div>
                <div 
                  className="w-full h-20 rounded-lg mb-2"
                  style={{ backgroundColor: colors.accentAmber }}
                ></div>
                <p className="text-sm font-medium">Accent Amber</p>
                <p className="text-xs text-stone-500">#F59E0B</p>
              </div>
              <div>
                <div 
                  className="w-full h-20 rounded-lg mb-2"
                  style={{ backgroundColor: colors.accentOrange }}
                ></div>
                <p className="text-sm font-medium">Accent Orange</p>
                <p className="text-xs text-stone-500">#EA580C</p>
              </div>
              <div>
                <div 
                  className="w-full h-20 rounded-lg mb-2"
                  style={{ backgroundColor: colors.statusSuccess }}
                ></div>
                <p className="text-sm font-medium">Success</p>
                <p className="text-xs text-stone-500">#22C55E</p>
              </div>
              <div>
                <div 
                  className="w-full h-20 rounded-lg mb-2"
                  style={{ backgroundColor: colors.statusWarning }}
                ></div>
                <p className="text-sm font-medium">Warning</p>
                <p className="text-xs text-stone-500">#F59E0B</p>
              </div>
              <div>
                <div 
                  className="w-full h-20 rounded-lg mb-2"
                  style={{ backgroundColor: colors.statusError }}
                ></div>
                <p className="text-sm font-medium">Error</p>
                <p className="text-xs text-stone-500">#EF4444</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Design Token Values */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Verified Design Token Values</h2>
          <div 
            className="p-6 border"
            style={{
              backgroundColor: colors.bentoBg,
              borderColor: colors.bentoBorder,
              borderRadius: '1rem',
            }}
          >
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-stone-400' : 'text-stone-600'}>Base Dark:</span>
                <span>{colors.baseDark}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-stone-400' : 'text-stone-600'}>Bento Background:</span>
                <span>{isDarkMode ? '#292524' : 'rgba(250, 250, 249, 0.9)'}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-stone-400' : 'text-stone-600'}>Bento Border:</span>
                <span>{colors.bentoBorder}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-stone-400' : 'text-stone-600'}>Glass Background:</span>
                <span>{isDarkMode ? 'rgba(41, 37, 36, 0.5)' : 'rgba(245, 245, 244, 0.7)'}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-stone-400' : 'text-stone-600'}>Backdrop Blur:</span>
                <span>12px</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-stone-400' : 'text-stone-600'}>Border Radius XL:</span>
                <span>1rem (16px)</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-stone-400' : 'text-stone-600'}>Accent Amber:</span>
                <span>{colors.accentAmber}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-stone-400' : 'text-stone-600'}>Accent Orange:</span>
                <span>{colors.accentOrange}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-stone-400' : 'text-stone-600'}>Status Success:</span>
                <span>{colors.statusSuccess}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-stone-400' : 'text-stone-600'}>Status Warning:</span>
                <span>{colors.statusWarning}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-stone-400' : 'text-stone-600'}>Status Error:</span>
                <span>{colors.statusError}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
