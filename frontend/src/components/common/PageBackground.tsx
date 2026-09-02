/**
 * PageBackground
 *
 * Renders ambient, heavily-blurred background blobs behind all page content.
 * Gives glassmorphism surfaces (backdrop-blur + translucent fills) colorful,
 * dynamic shapes to blur against.
 *
 * Fixed, pointer-events: none, z-index: 0.
 */
export function PageBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Top-right Accent Orange (#FF4D2E) blob */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 filter blur-[90px]"
        style={{ backgroundColor: '#FF4D2E' }}
      />

      {/* Center-left Success Green (#5DCAA5) blob */}
      <div
        className="absolute top-1/3 -left-40 w-[450px] h-[450px] rounded-full opacity-15 filter blur-[100px]"
        style={{ backgroundColor: '#5DCAA5' }}
      />

      {/* Bottom-right Warning Amber (#EF9F27) blob */}
      <div
        className="absolute -bottom-32 right-1/4 w-[400px] h-[400px] rounded-full opacity-15 filter blur-[90px]"
        style={{ backgroundColor: '#EF9F27' }}
      />
    </div>
  );
}
export default PageBackground;
