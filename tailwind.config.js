/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // The editor already has its own base styles (diagram-js, palette, context pad);
  // only Tailwind's utilities are used, so its global reset stays off.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: { accent: '#3061c4' },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        'modal-in': { from: { opacity: '0', transform: 'translateY(8px) scale(.97)' }, to: { opacity: '1', transform: 'none' } },
        'backdrop-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out',
        'modal-in': 'modal-in .18s ease-out',
        'backdrop-in': 'backdrop-in .15s ease-out',
        'slide-up': 'slide-up .22s cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
};
