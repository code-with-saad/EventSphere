import { useState } from 'react';

/**
 * Test page to verify EventSphere design tokens
 * This component demonstrates:
 * - Bento Card styling (bg-slate-900/80, border-slate-800, rounded-xl)
 * - Glass Component styling (bg-slate-900/40, backdrop-blur-md)
 * - Accent colors (Emerald and Indigo)
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
    baseDark: '#0a0a0f',
    baseLight: '#f8fafc',
    bentoBg: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)',
    bentoBorder: isDarkMode ? '#1e293b' : '#e2e8f0',
    glassBg: isDarkMode ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.6)',
    accentEmerald: '#10b981',
    accentEmeraldLight: '#d1fae5',
    accentIndigo: '#6366f1',
    accentIndigoLight: '#e0e7ff',
  };

  return (
    <div className="min-h-screen p-8 transition-colors duration-300">
      {/* Header with Glass Effect */}
      <header 
        className="border-b p-6 mb-8 sticky top-4"
        style={{
          backgroundColor: colors.glassBg,
          backdropFilter: 'blur(12px)',
          borderColor: isDarkMode ? 'rgba(100, 116, 139, 0.5)' : 'rgba(203, 213, 225, 0.5)',
          borderRadius: '1rem',
        }}
      >
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">EventSphere Design Tokens Test</h1>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 text-white rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: colors.accentIndigo }}
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
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
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
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
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
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                View and edit your account information.
              </p>
            </div>
          </div>
        </section>

        {/* Section: Status Badges with Accent Colors */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Accent Colors - Status Badges</h2>
          <div className="flex flex-wrap gap-4">
            <span 
              className="px-4 py-2 text-white rounded-lg font-medium"
              style={{ backgroundColor: colors.accentEmerald }}
            >
              ✓ Active
            </span>
            <span 
              className="px-4 py-2 rounded-lg font-medium"
              style={{ 
                backgroundColor: colors.accentEmeraldLight,
                color: colors.accentEmerald,
              }}
            >
              ✓ Verified
            </span>
            <span 
              className="px-4 py-2 text-white rounded-lg font-medium"
              style={{ backgroundColor: colors.accentIndigo }}
            >
              ⏳ Pending
            </span>
            <span 
              className="px-4 py-2 rounded-lg font-medium"
              style={{ 
                backgroundColor: colors.accentIndigoLight,
                color: colors.accentIndigo,
              }}
            >
              ℹ Info
            </span>
          </div>
        </section>

        {/* Section: Glass Sidebar Preview */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Glass Component (Sidebar Preview)</h2>
          <div 
            className="relative h-64 overflow-hidden"
            style={{
              background: 'linear-gradient(to bottom right, #6366f1, #a855f7)',
              borderRadius: '1rem',
            }}
          >
            {/* Simulated sidebar with glass effect */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-64 p-6 border-r"
              style={{
                backgroundColor: colors.glassBg,
                backdropFilter: 'blur(12px)',
                borderColor: isDarkMode ? 'rgba(100, 116, 139, 0.5)' : 'rgba(203, 213, 225, 0.5)',
              }}
            >
              <div className="space-y-4">
                <div className="text-white font-bold text-lg">Navigation</div>
                <div className="space-y-2">
                  <div className="p-2 rounded hover:bg-white/10 transition-colors cursor-pointer text-white">
                    Dashboard
                  </div>
                  <div className="p-2 rounded hover:bg-white/10 transition-colors cursor-pointer text-white">
                    Events
                  </div>
                  <div className="p-2 rounded hover:bg-white/10 transition-colors cursor-pointer text-white">
                    Profile
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute right-4 top-4 text-white text-sm">
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
                <p className="text-xs text-gray-500">#0a0a0f</p>
              </div>
              <div>
                <div 
                  className="w-full h-20 rounded-lg mb-2"
                  style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
                ></div>
                <p className="text-sm font-medium">Bento BG</p>
                <p className="text-xs text-gray-500">slate-900/80</p>
              </div>
              <div>
                <div 
                  className="w-full h-20 rounded-lg mb-2"
                  style={{ backgroundColor: colors.accentEmerald }}
                ></div>
                <p className="text-sm font-medium">Accent Emerald</p>
                <p className="text-xs text-gray-500">#10b981</p>
              </div>
              <div>
                <div 
                  className="w-full h-20 rounded-lg mb-2"
                  style={{ backgroundColor: colors.accentIndigo }}
                ></div>
                <p className="text-sm font-medium">Accent Indigo</p>
                <p className="text-xs text-gray-500">#6366f1</p>
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
                <span className="text-gray-400">Base Dark:</span>
                <span>{colors.baseDark}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bento Background:</span>
                <span>rgba(15, 23, 42, 0.8)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bento Border:</span>
                <span>{isDarkMode ? '#1e293b' : '#e2e8f0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Glass Background:</span>
                <span>rgba(15, 23, 42, 0.4)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Backdrop Blur:</span>
                <span>12px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Border Radius XL:</span>
                <span>1rem (16px)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Accent Emerald:</span>
                <span>{colors.accentEmerald}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Accent Indigo:</span>
                <span>{colors.accentIndigo}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
