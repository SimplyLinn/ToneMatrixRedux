module.exports = {
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: [
    '@typescript-eslint',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 6,
  },
  rules: {
    'import/extensions': ['error', 'ignorePackages', { js: 'never', ts: 'never' }],
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    'linebreak-style': 'off',
  },
  env: {
    browser: true,
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
};
