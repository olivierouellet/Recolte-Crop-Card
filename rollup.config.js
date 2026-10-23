import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';

const onwarn = (warning, warn) => {
  if (warning.code === 'THIS_IS_UNDEFINED' && warning.id?.includes('/node_modules/')) {
    return;
  }

  warn(warning);
};

export default [
  {
    input: 'src/recolte-crop-card.ts',
    output: {
      file: 'dist/recolte-crop-card.js',
      format: 'es',
      inlineDynamicImports: true,
    },
    plugins: [nodeResolve(), typescript(), json(), terser()],
    onwarn,
  },
];
