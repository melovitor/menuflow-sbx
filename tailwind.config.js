export default {
  future: {
    hoverOnlyWhenSupported: true,
  },
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#7C3AED',
          light: '#EDE9FE',
          text: '#5B21B6',
          dark: '#A78BFA',
          'dark-bg': '#1A1030',
        },
      },
      borderRadius: {
        card: '14px',
        section: '12px',
        input: '10px',
        pill: '20px',
      },
    },
  },
  plugins: [
    ({ addVariant }) => {
      addVariant('hov', '@media (hover: hover) { &:hover }')
    },
  ],
}
