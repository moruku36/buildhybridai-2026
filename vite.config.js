import {defineConfig} from 'vite';
// Disable the development path in every build, including custom modes.
export default defineConfig(({command}) => ({
  define: command === 'build' ? {
    'import.meta.env.DEV': 'false',
    'import.meta.env.PROD': 'true',
  } : {},
}));
