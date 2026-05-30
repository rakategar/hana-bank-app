/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        hana: {
          teal: {
            50: '#EAF9F6',
            100: '#CDF0E9',
            500: '#04B292',
            600: '#038E75',
            700: '#026B58',
          },
          pink: {
            50: '#FDECF2',
            100: '#FAD3DF',
            500: '#E62560',
            600: '#B81E4D',
          },
        },
        // Neutral tokens — LIGHT THEME (nama dipertahankan agar konsisten)
        charcoal: '#F4F6FA', // page canvas (light)
        card: '#FFFFFF', // card surface
        elevated: '#F1F5F9', // input / subtle surface
        'hana-border': '#E2E8F0', // borders & dividers
        ink: '#1F2933', // primary text (dark)
        'text-secondary': '#475569', // secondary text
        'text-muted': '#94A3B8', // muted text
        sidebar: '#0F2A24', // dark teal sidebar (desktop)
        'sidebar-soft': '#15392F',
        score: {
          1: '#EF4444',
          2: '#F97316',
          3: '#3B82F6',
          4: '#22C55E',
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        elevated: '0 8px 24px rgba(16, 24, 40, 0.10)',
        focus: '0 0 0 3px rgba(4, 178, 146, 0.18)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.45s ease-out forwards',
        'slide-down': 'slide-down 0.3s ease-out forwards',
        shimmer: 'shimmer 1.5s infinite linear',
      },
    },
  },
  plugins: [],
};
