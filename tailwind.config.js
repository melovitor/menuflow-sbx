/** @type {import('tailwindcss').Config} */
export default {
  future: {
    hoverOnlyWhenSupported: true,
  },
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#D4A258',
          strong: '#B7842F',
          light: '#F5E9D2',
          text: '#6B4818',
          dark: '#E8C285',
          'dark-bg': '#2A2014',
          contrast: '#1A140C',
        },
      },
      borderRadius: {
        card: '12px',
        section: '10px',
        input: '9px',
        button: '9px',
        pill: '999px',
      },
    },
  },
  plugins: [
    ({ addVariant }) => {
      addVariant('hov', '@media (hover: hover) { &:hover }')
    },
  ],
}
