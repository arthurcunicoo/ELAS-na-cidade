const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
const designSystem = require('./eslint-rules/design-system.cjs');
const dataBoundary = require('./eslint-rules/data-boundary.cjs');
const reactCompiler = require('./app.json').expo.experiments?.reactCompiler === true;
module.exports = defineConfig([
  expo,
  // Preserve the uncompiled RN Animated/Reanimated behavior during the SDK
  // migration. Compiler diagnostics become active if the compiler is enabled.
  { rules: reactCompiler ? {} : {
    'react-hooks/refs': 'off',
    'react-hooks/immutability': 'off',
    'react-hooks/purity': 'off',
    'react-hooks/set-state-in-effect': 'off',
  } },
  { ignores: ['dist/**', 'supabase/functions/**', 'tests/**', 'scripts/**', 'lib/database.types.ts'] },
  { files: ['app/**/*.tsx', 'components/**/*.tsx', 'features/**/*.tsx'], plugins: { elas: { rules: { 'design-system': designSystem, 'data-boundary': dataBoundary } } }, rules: { 'elas/design-system': 'error', 'elas/data-boundary': 'error' } },
]);
