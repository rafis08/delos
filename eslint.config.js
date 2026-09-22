const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
module.exports = defineConfig([
  { ignores: ['dist/**', 'coverage/**', '.expo/**', 'sources/**', 'supabase/functions/**', 'website/**'] },
  ...expoConfig,
  {
    rules: { 'react-hooks/set-state-in-effect': 'off' },
  },
]);
