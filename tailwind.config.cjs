/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        'solana-purple': '#9945FF',
        'solana-cyan': '#00FFA3',
        'solana-green': '#14F195',
        'solana-dark': '#0A0A0A',
      },
      backgroundImage: {
        'gradient-solana': 'linear-gradient(90deg, #9945FF, #14F195)',
      },
      boxShadow: {
        // тончайший glow
        'neon-solana': '0 0 2px rgba(153,69,255,0.4), 0 0 2px rgba(0,255,163,0.3)',
      },
    },
  },
  plugins: [],
};
