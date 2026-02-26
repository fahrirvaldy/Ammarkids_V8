/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: { 
        google: { 
          blue: '#4285F4', 
          green: '#34A853', 
          red: '#EA4335', 
          yellow: '#FBBC05', 
          gray: '#f1f3f4', 
          text: '#202124' 
        } 
      },
      fontFamily: { 
        sans: ['Roboto', 'Segoe UI', 'sans-serif'] 
      }
    },
  },
  plugins: [],
}
