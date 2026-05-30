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
        charcoal: '#1F2933',
        card: '#263544',
        elevated: '#2E4057',
        'hana-border': '#374B5C',
        'text-secondary': '#A0B4C8',
        'text-muted': '#52616B',
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
