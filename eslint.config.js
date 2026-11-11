import tseslint from 'typescript-eslint';

// FR-A2-22 / NFR-1: nothing except the executor (and A1's own folder/order routes) may import lib/paypal.
const paypalImport = [{ group: ['**/paypal', '**/paypal/*', '**/lib/paypal*'], message: 'Only src/lib/policy/executor.ts may call PayPal. Go through the executor.' }];

export default tseslint.config(
  { ignores: ['node_modules', '.next', 'drizzle'] },
  ...tseslint.configs.recommended,
  { files: ['src/**/*.ts'], ignores: ['src/lib/paypal/**', 'src/lib/policy/executor.ts', 'src/lib/policy/executor.test.ts', 'src/app/api/order/**'],
    rules: { '@typescript-eslint/no-restricted-imports': ['error', { patterns: paypalImport }], 'no-restricted-imports': 'off' } },
  { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }], '@typescript-eslint/no-explicit-any': 'error' } },
);
