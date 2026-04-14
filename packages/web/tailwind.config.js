/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                'team-red': '#E75480',
                'team-blue': '#4A90D9',
                'scorecard-navy': '#1a1a3e',
                'forest-deep': '#0a4030',
                'forest-mid': '#147255',
                'gold-border': '#fbbc05',
                'gold-light': '#fce8b2',
                'brass': '#e37400',
                'nav-teal': '#1a4a5e',
                'cream': '#ffffff',
                'header-navy': '#1a2b3c',
                'ryder-bg': '#e6f4ea',
                'ryder-dark': '#1e293b',
                'stroke-dark': '#1e293b',
            },
            fontFamily: {
                bangers: ['var(--font-bangers)', 'cursive'],
                fredoka: ['var(--font-fredoka)', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
