module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'revert'
      ]
    ],
    'scope-enum': [
      2,
      'always',
      [
        'ui',
        'admin',
        'auth',
        'api',
        'components',
        'utils',
        'hooks',
        'services',
        'theme',
        'layout',
        'responsive',
        'accessibility',
        'performance',
        'security',
        'testing',
        'ci',
        'docs'
      ]
    ],
    'subject-max-length': [2, 'always', 72],
    'header-max-length': [2, 'always', 100]
  }
};
