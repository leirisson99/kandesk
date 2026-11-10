import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // extencao-exemplo/ é a referência original (não mantida aqui); o código ativo está em extension/.
  { ignores: ['node_modules', 'out', 'dist', 'release', 'extencao-exemplo'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Preload com sandbox só pode carregar 'electron'; Zod e os contratos (que o usam) ficam de fora.
    files: ['src/preload/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['zod', '@shared/contracts/*', '@shared/schemas/*', '@shared/domain/*'],
              allowTypeImports: true,
              message:
                'O preload (sandbox) não pode carregar dependências em runtime; importe apenas tipos.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    // Extensão do Chrome (JavaScript puro, módulos ES, executa no navegador).
    files: ['extension/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        chrome: 'readonly',
        document: 'readonly',
        window: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        btoa: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
