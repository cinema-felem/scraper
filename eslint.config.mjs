import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'

export default [
  { ignores: ['**/*.{js,mjs,cjs}'] },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-explicit-any': 'warn', 'no-console': 'warn' } },
]
