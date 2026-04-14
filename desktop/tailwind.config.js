/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./electron/**/*.{js,ts}"
  ],
  theme: {
    extend: {
      colors: {
        'glass-light': 'rgba(255, 255, 255, 0.15)',
        'glass-medium': 'rgba(255, 255, 255, 0.2)',
        'glass-dark': 'rgba(255, 255, 255, 0.1)',
        'accent': '#00d4ff',
        'success': '#00ff88',
        'primary-start': '#667eea',
        'primary-end': '#764ba2'
      },
      backdropBlur: {
        'glass': '20px'
      },
      borderRadius: {
        'glass': '16px'
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'glass-hover': '0 12px 48px rgba(0, 0, 0, 0.15)'
      }
    }
  },
  plugins: []
}