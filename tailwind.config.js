/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dexa: {
          black: '#05070d',
          panel: '#0b1020',
          line: '#1c2740',
          blue: '#2f7df6',
          cyan: '#29d3ff',
          ink: '#eaf1ff',
          muted: '#93a4bf',
        },
      },
      boxShadow: {
        glow: '0 24px 80px rgba(47, 125, 246, 0.22)',
        panel: '0 22px 70px rgba(0, 0, 0, 0.34)',
      },
      animation: {
        floatIn: 'floatIn 520ms ease both',
        pulseSoft: 'pulseSoft 2.8s ease-in-out infinite',
      },
      keyframes: {
        floatIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.72', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.025)' },
        },
      },
    },
  },
  plugins: [],
};
