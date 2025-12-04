import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import { configs as eslintConfigs } from '@eslint/js';

export default defineConfig(
    eslintConfigs.recommended,
    ...tseslint.configs.strictTypeChecked,

    {
        files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url)),
                project: true,
            },
        },
    },
    globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '*.config.ts', '.*rc.ts']),
);
