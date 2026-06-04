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
            200: '#9FE3D6',
            500: '#04B292',
            600: '#038E75',
            700: '#026B58',
            800: '#064D43',
          },
          pink: {
            50: '#FDECF2',
            100: '#FAD3DF',
            500: '#E62560',
            600: '#B81E4D',
            700: '#8F183D',
          },
        },
        surface: {
          canvas: '#F6F8FB',
          panel: '#FFFFFF',
          muted: '#F1F5F9',
          subtle: '#F8FAFC',
        },
        charcoal: '#F6F8FB',
        card: '#FFFFFF',
        elevated: '#F1F5F9',
        'hana-border': '#E2E8F0',
        ink: '#1F2933',
        'text-secondary': '#475569',
        'text-muted': '#8A9AB3',
        sidebar: '#0B3029',
        'sidebar-soft': '#123C34',
        score: {
          1: '#EF4444',
          2: '#F97316',
          3: '#3B82F6',
          4: '#22C55E',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.035), 0 10px 24px rgba(15, 23, 42, 0.045)',
        raised: '0 18px 38px rgba(15, 23, 42, 0.08)',
        elevated: '0 28px 70px rgba(15, 23, 42, 0.12)',
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
