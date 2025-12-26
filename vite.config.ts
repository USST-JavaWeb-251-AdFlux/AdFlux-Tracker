import { defineConfig, loadEnv, UserConfig } from 'vite';
import minifyHtml from 'vite-plugin-html-minifier';
import removeConsole from 'vite-plugin-remove-console';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    const config: UserConfig = {
        root: 'src',
        base: './',
        plugins: [
            minifyHtml(),
            mode === 'production' ? removeConsole() : null,
            {
                name: 'version-file',
                configureServer(server) {
                    server.middlewares.use((req, res, next) => {
                        if (req.url === '/version.txt') {
                            res.setHeader('Content-Type', 'text/plain');
                            res.end('[Dev]');
                            return;
                        }
                        next();
                    });
                },
                generateBundle() {
                    this.emitFile({
                        type: 'asset',
                        fileName: 'version.txt',
                        source: env.VITE_APP_VERSION ?? '[Unknown]',
                    });
                },
            },
        ],
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
        },
    };

    try {
        const apiHost = new URL(env.VITE_API_HOST);
        if (config.server) {
            config.server.proxy = {
                [apiHost.pathname]: {
                    target: apiHost.origin,
                    changeOrigin: true,
                },
            };
        }
    } catch {}

    return config;
});
