import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
            },
        },
        rules: {
            // Allow unused vars starting with underscore
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
            ],
            // Allow explicit any for flexibility
            '@typescript-eslint/no-explicit-any': 'off',
            // Allow require for dynamic imports
            '@typescript-eslint/no-require-imports': 'off',
            // Allow namespaces for Express augmentation
            '@typescript-eslint/no-namespace': 'off',
            // Allow Function type for middleware
            '@typescript-eslint/no-unsafe-function-type': 'off',
            // Allow regex escapes that aren't strictly necessary
            'no-useless-escape': 'off',
            // Disable some strict rules for development
            '@typescript-eslint/no-empty-function': 'off',
            'no-empty': 'warn',
        },
    },
    {
        ignores: ['dist/**', 'node_modules/**', '*.js'],
    }
);
