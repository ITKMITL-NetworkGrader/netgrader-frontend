module.exports = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Geist Mono"', '"Bai Jamjuree"', "monospace"],
                mono: ['"JetBrains Mono"', '"Bai Jamjuree"', "monospace"],
            },
            colors: {
                'phosphor-green': '#00FF41',
                'dim-green': 'rgba(0, 255, 65, 0.3)',
            },
            keyframes: {
                'marquee-right': {
                    '0%': { transform: 'translateX(-50%)' },
                    '100%': { transform: 'translateX(0)' },
                },
            },
            animation: {
                'marquee-right': 'marquee-right 30s linear infinite',
            },
        },
    },
    plugins: [
        require('preline/plugin'),
    ],
}