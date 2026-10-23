import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // This project uses effects to hydrate browser-only state (localStorage,
      // URL notices, and async adapters). The React Compiler rule flags those
      // established patterns; keep the correctness-focused rules enabled.
      'react-hooks/set-state-in-effect': 'off',
      // Community images are user-provided data URLs or Supabase signed URLs
      // that are not known at build time, so the plain <img> element is
      // intentional.
      '@next/next/no-img-element': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    'android/**',
    'capacitor-web/**',
  ]),
]);

export default eslintConfig;
