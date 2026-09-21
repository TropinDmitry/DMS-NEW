/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Дизайн-токены: цвета описаны ОДИН раз здесь, а в разметке используются по имени (bg-brand, text-primary-600).
      // Захочешь перекрасить приложение — меняй значения тут, а не сотню мест в коде.
      colors: {
        brand: {
          DEFAULT: '#004c5c', // фон боковой панели
          light: '#0792b0', // наведение / активный пункт
          dark: '#00363f',
        },
        primary: {
          50: '#eeeafd',
          100: '#dcd5fb',
          500: '#4a37e6',
          600: '#321fdb', // главные кнопки, ссылки
          700: '#2716b0',
        },
        surface: '#eef5f3', // фон области содержимого
      },
      fontFamily: {
        sans: ['Roboto', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)',
        pop: '0 4px 14px rgba(0, 0, 0, 0.18)',
      },
    },
  },
  plugins: [],
};
