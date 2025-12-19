import { defineConfig, loadEnv } from 'vite';
import minifyHtml from 'vite-plugin-html-minifier';
import removeConsole from 'vite-plugin-remove-console';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd());
    const apiHost = new URL(env.VITE_API_HOST);

    return {
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
            host: '127.0.0.1',
            port: 5174,
            strictPort: true,
            proxy: {
                [apiHost.pathname]: {
                    target: apiHost.origin,
                    changeOrigin: true,
                },
            },
        },
    };
});
