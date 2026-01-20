// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [js.configs.recommended, ...tseslint.configs.recommended, {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
        'react': reactPlugin,
        'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
        parserOptions: {
            ecmaFeatures: {
                jsx: true,
            },
        },
    },
    settings: {
        react: {
            version: 'detect',
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
        // Allow empty interfaces for React components
        '@typescript-eslint/no-empty-object-type': 'off',
        // Prefer const assertions
        'prefer-const': 'warn',
        // React hooks rules
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        // Allow case declarations in switch
        'no-case-declarations': 'off',
        // Allow regex escapes 
        'no-useless-escape': 'off',
    },
}, {
    ignores: ['.next/**', 'node_modules/**', '*.config.*'],
}, ...storybook.configs["flat/recommended"]];
