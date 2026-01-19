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
            // Disable some strict rules for development
            '@typescript-eslint/no-empty-function': 'off',
            // Allow @ts-ignore comments
            '@typescript-eslint/ban-ts-comment': 'off',
            // Allow regex escapes
            'no-useless-escape': 'off',
            'no-empty': 'warn',
        },
    },
    {
        ignores: ['dist/**', 'node_modules/**', '*.js'],
    }
);
