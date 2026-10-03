/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:  '#2563EB',   // primary — headings, links, logo, active states
          light: '#EFF6FF',   // tinted panels
        },
        ink:      '#1F2225',   // near-black — primary buttons
        success:  '#16A34A',
        'success-light': '#DCFCE7',
        warning:  '#B45309',
        'warning-light': '#FEF3C7',
        danger:   '#DC2626',
        neutral:  {
          50:  '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
      },
    },
  },
  plugins: [],
}

