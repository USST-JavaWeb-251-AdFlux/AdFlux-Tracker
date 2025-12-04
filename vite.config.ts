import { defineConfig } from 'vite';
import minifyHtml from 'vite-plugin-html-minifier';
import removeConsole from 'vite-plugin-remove-console';

export default defineConfig(({ mode }) => ({
    root: 'src',
    base: './',
    plugins: [minifyHtml(), mode === 'production' ? removeConsole() : null],
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: 'src/main.ts',
                tracker: 'src/tracker.html',
            },
            output: {
                entryFileNames: (chunkInfo) => {
                    if (chunkInfo.name === 'main') {
                        return 'main.js';
                    }
                    return 'assets/[name]-[hash].js';
                },
            },
        },
    },
    server: {
        open: '/debug.html',
    },
}));
